from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponseRedirect, Http404
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse

from cabinet.forms import MemberForm
from cabinet.models import Project, Member, Task
from cabinet.views import BaseView, BaseCreateView, BaseUpdateView
from main.models import User


class MemberList(BaseView):
    http_method_names = ['get',]
    template_name = 'member/list.html'

    def get(self, request, *args, **kwargs):
        context = {}
        if self.has_perm(perm='member_create'):
            context['admin_links'] = [{
                'url': reverse('cabinet:member-create', kwargs={'project_id': self.kwargs.get('project_id')}),
                'get': reverse('cabinet:member-modal-create', kwargs={'project_id': self.kwargs.get('project_id')}),
                'class': 'nav-link fs-5 px-2', 'text': '<i class="bi bi-plus-lg"></i>'}]
        context['members'] = []
        for user in User.objects.distinct('pk').filter(member__project__pk=self.kwargs.get('project_id')):
            members = user.member_set.filter(project__pk=self.kwargs.get('project_id'))
            context['members'].append({
                'pk': user.pk,
                'name': user.__str__(),
                'photo': user.photo.url if user.photo else None,
                'is_approved': members[0].is_approved,
                'is_entry': members[0].is_entry,
                'get_absolute_url': members[0].get_absolute_url(),
                'members': members,
            })
        context['title'] = 'Все участники'
        context['project_id'] = self.kwargs.get('project_id')
        return render(request, self.template_name, context)


class MemberAccept(BaseView):
    http_method_names = ['get']
    perm = 'member_update'

    def get(self, request, *args, **kwargs):
        members = Member.objects.filter(project__member__user=request.user, project__pk=kwargs.get('project_id'),
                                        user__pk=kwargs.get('user_id'))
        if members:
            members.update(is_entry=False, is_approved=True)
            messages.success(request, 'Пользователь успешно принят в проект')
        else:
            messages.error(request, 'Не удалось принять пользователя в проект. Возможно, он был удален')
        return redirect('cabinet:members', project_id=kwargs.get('project_id'))


class MemberDecline(BaseView):
    http_method_names = ['get']
    perm = 'member_delete'

    def get(self, request, *args, **kwargs):
        members = Member.objects.filter(project__member__user=request.user, project__pk=kwargs.get('project_id'),
                                        user__pk=kwargs.get('user_id'))
        if members:
            members.delete()
            messages.error(request, 'Вы отклонили заявку пользователя')
        else:
            messages.error(request, 'Кто-то до Вас отклонил заявку пользователя')
        return redirect('cabinet:members', project_id=kwargs.get('project_id'))


class MemberCreate(BaseCreateView):
    template_name = 'base_form.html'
    form_class = MemberForm
    project = None
    perm = 'member_create'

    def get_form(self, form_class=None):
        if form_class is None:
            form_class = self.get_form_class()
        return form_class(project=self.project, **self.get_form_kwargs())

    def dispatch(self, request, *args, **kwargs):
        self.project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        self.extra_context = {'title': 'Добавление пользователя', 'project_id': kwargs.get('project_id')}
        return super(MemberCreate, self).dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        instance = form.save(commit=False)
        instance.project = self.project
        if self.project.member_set.filter(user=instance.user).count():
            instance.is_approved = True
        instance.save()
        messages.success(self.request, 'Приглашение успешно отправлено')
        if next_ := self.request.POST.get('next', None):
            return HttpResponseRedirect(next_)
        return redirect('cabinet:members', project_id=self.project.pk)


class MemberUpdate(BaseUpdateView):
    template_name = 'base_form.html'
    form_class = MemberForm
    project = None
    perm = 'member_update'

    def get_form(self, form_class=None):
        if form_class is None:
            form_class = self.get_form_class()
        return form_class(project=self.project, **self.get_form_kwargs())

    def get_object(self, queryset=None):
        member = get_object_or_404(Member, project__pk=self.kwargs.get('project_id'), pk=self.kwargs.get('member_id'))
        self.extra_context = {'title': 'Изменение данных участника проекта', 'project_id': self.kwargs.get('project_id')}
        return member

    def form_valid(self, form):
        form.save()
        messages.success(self.request, 'Данные успешно изменены')
        return redirect(self.request.POST.get('next', self.object.get_absolute_url()))


class MemberDelete(BaseView):
    http_method_names = ['get']
    perm = 'member_delete'

    def get(self, request, *args, **kwargs):
        get_object_or_404(Member, project__pk=kwargs.get('project_id'), pk=kwargs.get('member_id')).delete()
        messages.error(request, 'Участник проекта успешно удален')
        return redirect('cabinet:members', project_id=kwargs.get('project_id'))


class MemberPage(BaseView):
    http_method_names = ['get', ]
    context_object_name = 'member'
    template_name = 'member/page.html'
    perm = 'member_read'

    def get(self, request, *args, **kwargs):
        try:
            user = User.objects.distinct('pk').prefetch_related('member_set').get(
                pk=kwargs.get('user_id'), member__project__pk=kwargs.get('project_id'))
        except ObjectDoesNotExist:
            raise Http404('Участник проекта не найден')
        return render(request, self.template_name, {
            'member_delete': self.has_perm(perm='member_delete'),
            'member_update': self.has_perm(perm='member_update'),
            'project_id': kwargs.get('project_id'),
            'title': f'Участник проекта &laquo;{user}&raquo;',
            'tasks': Task.objects.filter(member__user=user, project__pk=kwargs.get('project_id')),
            'user': user,
            'members': user.member_set.filter(project__pk=kwargs.get('project_id')),
            'user_id': user.pk
        })
