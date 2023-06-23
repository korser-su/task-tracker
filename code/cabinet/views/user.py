from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.core.files.base import ContentFile
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404, render, redirect
from django.urls import reverse

from cabinet.forms import UserSettingsForm
from cabinet.models import Member, Role, UserCompetence, Competence
from cabinet.views import BaseView, BaseListView
from main.models import User


class UserList(BaseListView):
    model = User
    template_name = 'user/list.html'
    context_object_name = 'users'

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Все пользователи'
        context['projects'] = self.request.user.project_set.all()
        return context

    def get_queryset(self):
        return User.objects.prefetch_related('usercompetence_set').all()


class UserPage(BaseView):
    http_method_names = ['get', 'post']
    template_name = 'user/page.html'

    def get(self, request, *args, **kwargs):
        user = get_object_or_404(User, pk=kwargs.get('user_id'))
        form = None
        if request.user == user:
            form = UserSettingsForm(instance=request.user, use_required_attribute=False)
            self.template_name = 'user/form.html'
        return render(request, self.template_name, {'title': f'Профиль пользователя &laquo;{user.__str__()}&raquo;',
                                                    'user': user, 'projects': request.user.project_set.all(),
                                                    'form': form})

    def post(self, request, *args, **kwargs):
        user = get_object_or_404(User, pk=kwargs.get('user_id'))
        if request.user == user:
            form = UserSettingsForm(instance=request.user, data=request.POST, use_required_attribute=False)
            saved = False
            if 'avatar' in request.FILES:
                if request.user.photo:
                    request.user.photo.delete()
                request.user.photo.save(request.FILES['avatar'].name, ContentFile(request.FILES['avatar'].read()))
            if form.is_valid():
                form.save()
                saved = True
            request.user.usercompetence_set.all().delete()
            for c_id in request.POST.getlist('competence'):
                try:
                    UserCompetence.objects.create(competence=Competence.objects.get(pk=c_id), user=request.user)
                except ObjectDoesNotExist:
                    continue
            if saved:
                messages.success(request, 'Вы успешно сохранили настройки и компетенции!')
            else:
                messages.success(request, 'Вы успешно сохранили компетенции!')
            return redirect('cabinet:user-page', user_id=kwargs.get('user_id'))
        raise PermissionDenied('Это не Ваш профиль')


class UserInvite(BaseView):
    http_method_names = ['post']

    def post(self, request, *args, **kwargs):
        user = get_object_or_404(User, pk=kwargs.get('user_id'))
        if user.command_invites:
            role = get_object_or_404(Role, pk=request.POST['role'], project__member__user=request.user)
            next_ = request.POST.get('next', reverse('cabinet:users'))
            if not role.project.member_set.filter(user=user).count():
                Member.objects.create(project=role.project, role=role, user=user)
                messages.success(request, f'Приглашение пользователю &laquo;{user.__str__()}&raquo; успешно отправлено')
                return HttpResponseRedirect(next_)
            messages.error(request, f'Данный пользователь уже состоит в проекте &laquo;{role.project.name}&raquo;')
        else:
            next_ = reverse('cabinet:users')
            messages.error(request, f'Данный пользователь запретил высылать ему приглашения в проекты')
        return HttpResponseRedirect(next_)


class UserCompetenceFilter(BaseView):
    http_method_names = ['post']

    def post(self, request, *args, **kwargs):
        users = User.objects.distinct('pk').all()
        if name := request.POST.get('name'):
            users = users.filter(first_name__contains=name)
        if lastname := request.POST.get('lastname'):
            users = users.filter(last_name__contains=lastname)
        if email := request.POST.get('email'):
            users = users.filter(email__contains=email)
        if competences := request.POST.getlist('competence'):
            other = [User.objects.filter(usercompetence__competence__pk=c) for c in competences]
            users = users.intersection(*other)
        return render(request, 'user/ajax-list.html', {'users': users, 'projects': request.user.project_set.all()})


class ModalUserInvite(BaseView):
    http_method_names = ['get']

    def get(self, request, *args, **kwargs):
        return render(request, 'user/modal.html', {'user_id': kwargs.get('user_id'),
                                                   'projects': request.user.project_set.all()})