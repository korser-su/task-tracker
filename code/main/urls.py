from django.conf import settings
from django.urls import path, include, reverse_lazy
from django.contrib.auth.views import PasswordResetView, LoginView, LogoutView, PasswordChangeView,\
    PasswordChangeDoneView, PasswordResetDoneView, PasswordResetConfirmView, PasswordResetCompleteView
from django.views.generic import TemplateView

from . import views
from .forms import CustomRegistrationForm, CustomPasswordChangeForm, CustomAuthenticationForm, CustomPasswordResetForm

app_name = 'main'

urlpatterns = [
    path('', views.index, name='index'),
    # Урлы авторизации в джанго
    path('account/', include([
        path('login/', LoginView.as_view(template_name='django_registration/login.html',
                                         form_class=CustomAuthenticationForm,
                                         redirect_authenticated_user=True), name='login'),
        path('logout/', LogoutView.as_view(template_name='django_registration/logged_out.html'),
             {'next_page': settings.LOGOUT_REDIRECT_URL}, name='logout'),
        path('password/', include([
            path('change/', PasswordChangeView.as_view(success_url=reverse_lazy('main:password_change_done'),
                                                       form_class=CustomPasswordChangeForm,
                                                       template_name='django_registration/password_change_form.html'),
                 name='password_change'),
            path('change/done/', PasswordChangeDoneView.as_view(
                template_name='django_registration/password_change_done.html'), name='password_change_done'),
            path('reset/', PasswordResetView.as_view(
                form_class=CustomPasswordResetForm,
                email_template_name='django_registration/password_reset_email.txt',
                html_email_template_name='django_registration/password_reset_email.html',
                subject_template_name='django_registration/password_reset_subject.txt',
                success_url=reverse_lazy('main:password_reset_done'),
                template_name='django_registration/password_reset_form.html'), name='password_reset'),
            path('reset/done/', PasswordResetDoneView.as_view(
                template_name='django_registration/password_reset_done.html'), name='password_reset_done'),
            path('reset/<uidb64>/<token>/', PasswordResetConfirmView.as_view(
                template_name='django_registration/password_reset_confirm.html',
                success_url = reverse_lazy("main:password_reset_complete")), name="password_reset_confirm"),
            path('reset/done/',
                 PasswordResetCompleteView.as_view(template_name='django_registration/password_reset_done.html'),
                 name='password_reset_complete'),
        ])),
        # https://django-registration.readthedocs.io/en/3.0.1/index.html
        path('register/',
             views.CustomRegistrationView.as_view(form_class=CustomRegistrationForm, redirect_authenticated_user=True),
             name='django_registration_register'),
        path("activate/complete/", TemplateView.as_view(template_name="django_registration/activation_complete.html"),
             name="django_registration_activation_complete"),
        path('activate/<str:activation_key>/', views.CustomActivationView.as_view(),
             name='django_registration_activate'),
        path('', include('django_registration.backends.activation.urls')),
    ])),
]
