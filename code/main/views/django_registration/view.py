from django.http import HttpResponseRedirect
from django.shortcuts import resolve_url
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.urls import reverse_lazy
from django_registration.backends.activation.views import RegistrationView, ActivationView
from django.contrib.auth.views import PasswordResetView, PasswordResetConfirmView

REGISTRATION_SALT = getattr(settings, 'REGISTRATION_SALT', 'registration')


class CustomRegistrationView(RegistrationView):
    email_html_template = 'django_registration/activation_email.html'
    redirect_authenticated_user = False
    disallowed_url = reverse_lazy('main:django_registration_disallowed')
    success_url = reverse_lazy('main:django_registration_complete')

    def send_activation_email(self, user):
        # Send the activation email. The activation key is the username, signed using TimestampSigner.
        activation_key = self.get_activation_key(user)
        context = self.get_email_context(activation_key)
        context['user'] = user
        subject = render_to_string(
            template_name=self.email_subject_template,
            context=context,
            request=self.request,
        )
        # Force subject to a single line to avoid header-injection issues.
        subject = ''.join(subject.splitlines())
        message_text = render_to_string(template_name=self.email_body_template, context=context, request=self.request)
        message_html = render_to_string(template_name=self.email_html_template, context=context, request=self.request)
        msg = EmailMultiAlternatives(subject, message_text, settings.DEFAULT_FROM_EMAIL, [user.email])
        msg.attach_alternative(message_html, 'text/html')
        msg.send()

    def dispatch(self, *args, **kwargs):
        if self.redirect_authenticated_user and self.request.user.is_authenticated:
            return HttpResponseRedirect(resolve_url(settings.LOGIN_REDIRECT_URL))
        return super().dispatch(*args, **kwargs)


class CustomActivationView(ActivationView):
    success_url = reverse_lazy('main:django_registration_activation_complete')


class CustomPasswordResetView(PasswordResetView):
    email_template_name = 'django_registration/password_reset_email.txt'
    html_email_template_name = 'django_registration/password_reset_email.html'
    subject_template_name = 'django_registration/password_reset_subject.txt'
    success_url = reverse_lazy('main:password_reset_done')
    template_name = 'django_registration/password_reset_form.html'

class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    success_url = reverse_lazy("main:password_reset_complete")
