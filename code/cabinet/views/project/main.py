from datetime import datetime

from django.contrib import messages
from django.contrib.admin.options import get_content_type_for_model
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.generic import ListView

from cabinet.forms import ProjectForm
from cabinet.models import Project, Role, Member, Task, Sprint, ProjectLogEntry
from cabinet.models.task import get_task_list_tpl
from cabinet.views import BaseView, BaseDetailView, BaseCreateView, BaseUpdateView


class ProjectList(ListView):
    model = Project
    template_name = 'project/list.html'
    context_object_name = 'projects'
    extra_context = {'title': 'Проекты'}

    @method_decorator(login_required)
    def __call__(self, request, *args, **kwargs):
        self.setup(request, *args, **kwargs)
        return self.dispatch(request, *args, **kwargs)

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.user.is_staff:
            context['admin_links'] = [{
                'url': reverse('cabinet:project-create'), 'text': '<i class="bi bi-plus-lg"></i> Добавить',
                'class': 'nav-link fs-5 px-2', 'get': reverse('cabinet:project-modals-create')}]
        return context

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user, is_archived=False)


class ProjectRequest(View):
    http_method_names = ['post']

    @method_decorator(login_required)
    def __call__(self, request, *args, **kwargs):
        self.setup(request, *args, **kwargs)
        return self.dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        for member in project.member_set.all():
            if member.user == request.user:
                messages.error(request, f'Вы уже состоите в проекте &laquo;{project.name}&raquo;')
                return redirect('cabinet:projects')
        if role_id := request.POST.get('role_id', None):
            role = get_object_or_404(Role, pk=role_id, project=project)
            Member.objects.create(project=project, role=role, user=request.user, is_entry=True)
            messages.success(request, f'Вы отправили заявку в проект &laquo;{project.name}&raquo;')
        return redirect('cabinet:projects')


class ProjectRequestDelete(View):
    http_method_names = ['get']

    @method_decorator(login_required)
    def __call__(self, request, *args, **kwargs):
        self.setup(request, *args, **kwargs)
        return self.dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        member = get_object_or_404(Member, project__pk=kwargs.get('project_id'), user=request.user, is_entry=True)
        messages.error(request, f'Вы успешно отменили заявку из проекта &laquo;{member.project.name}&raquo;')
        member.delete()
        return redirect('cabinet:projects')


class ProjectApprove(View):
    http_method_names = ['get']

    @method_decorator(login_required)
    def __call__(self, request, *args, **kwargs):
        self.setup(request, *args, **kwargs)
        return self.dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        project = get_object_or_404(Project, pk=kwargs.get('project_id'), member__user=request.user,
                                    member__is_approved=False)
        member = project.member_set.get(user=request.user, is_approved=False)
        member.is_approved = True
        member.save()
        messages.success(request, f'Вы приняли приглашение в проект &laquo;{project.name}&raquo;')
        return redirect('cabinet:project-page', project_id=self.kwargs.get('project_id'))


class ProjectDisapprove(View):
    http_method_names = ['get']

    @method_decorator(login_required)
    def __call__(self, request, *args, **kwargs):
        self.setup(request, *args, **kwargs)
        return self.dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        project = get_object_or_404(Project, pk=kwargs.get('project_id'), member__user=request.user,
                                    member__is_approved=False)
        member = project.member_set.get(user=request.user, is_approved=False)
        member.delete()
        messages.success(request, f'Вы отклонили приглашение в проект &laquo;{project.name}&raquo;')
        return redirect('cabinet:projects')


class ProjectCreate(BaseCreateView):
    template_name = 'base_form.html'
    form_class = ProjectForm
    extra_context = {'title': 'Создание проекта'}

    def form_valid(self, form):
        instance = form.save(commit=False)
        instance.user = self.request.user
        instance.save()
        messages.success(self.request, f'Проект &laquo;{instance.name}&raquo; успешно создан')

        role = Role.objects.create(
            project=instance, name='Руководитель проекта',
            permissions={'role': 'create_read_update_delete', 'member': 'create_read_update_delete',
                         'project': 'read_update_delete_sprint', 'task': 'create_update_delete',
                         'taskComment': 'create_read_update_delete', 'taskTime': 'create_read_update_delete',
                         'rate': 'create_read_update_delete'})
        messages.success(self.request, 'Базовая роль &laquo;Руководитель проекта&raquo; успешно создана')

        Member.objects.create(project=instance, role=role, user=self.request.user, is_approved=True)
        messages.success(self.request, 'Вам создана карточка участника проекта')
        return HttpResponseRedirect(self.request.POST.get('next', reverse('cabinet:projects')))


class ProjectUpdate(BaseUpdateView):
    template_name = 'base_form.html'
    form_class = ProjectForm
    perm = 'project_update'

    def get_object(self, queryset=None):
        project = get_object_or_404(Project, pk=self.kwargs.get('project_id'))
        self.extra_context = {
            'title': f'Изменение проекта &laquo;{project.name}&raquo;',
            'project_id': self.kwargs.get('project_id'),
        }
        return project

    def form_valid(self, form):
        instance = form.save()
        messages.success(self.request, f'Проект &laquo;{instance.name}&raquo; успешно изменен')
        return HttpResponseRedirect(self.request.POST.get('next', instance.get_absolute_url()))


class ProjectDelete(BaseView):
    http_method_names = ['get']
    project = None
    perm = 'project_delete'

    def get(self, request, *args, **kwargs):
        project = get_object_or_404(Project, pk=self.kwargs.get('project_id'))
        messages.error(request, f'Проект &laquo;{project.name}&raquo; успешно архивирован')
        project.is_archived = True
        project.save()
        return redirect('cabinet:projects')


class ProjectPage(BaseDetailView):
    model = Project
    pk_url_kwarg = 'project_id'
    context_object_name = 'project'
    template_name = 'project/page.html'

    def get_context_data(self, **kwargs):
        context = super(ProjectPage, self).get_context_data(**kwargs)
        context['admin_links'] = []
        if self.has_perm(perm='project_delete'):
            context['admin_links'].append({'url': self.object.get_delete_url(), 'class': 'nav-link fs-5 px-2',
                                'get': self.object.modal_get_delete_url(), 'text': '<i class="bi bi-trash3-fill"></i>'})
        if self.has_perm(perm='project_update'):
            context['admin_links'].append({'url': self.object.get_update_url(), 'text': '<i class="bi bi-pencil"></i>',
                                'class': 'nav-link fs-5 px-2', 'get': self.object.modal_get_update_url()})
        context['title'] = f'Проект &laquo;{self.object.name}&raquo;'
        context['project_id'] = self.kwargs.get('project_id')
        context['dt_now'] = datetime.now()
        context['tasks'] = get_task_list_tpl()
        for task in self.object.task_set.order_by('checked_date'):
            context['tasks'][task.status]['tasks'].append(task)
        context['project_sprint'] = self.has_perm(perm='project_sprint')
        context['task_create'] = self.has_perm(perm='task_create')
        context['sprints'] = self.object.sprint_set.order_by('start')
        return context


class ProjectAjax(BaseView):
    http_method_names = ['post']
    base_statuses = ['open', 'in-progress', 'pause', 'stop', 'open-test', 'progress-test', 'ready', 'closed']
    task = None
    perm = 'task_update'

    def has_perm(self, perm=None):
        return super(ProjectAjax, self).has_perm(perm=perm) or self.request.user == self.task.member.user

    def dispatch(self, request, *args, **kwargs):
        self.task = get_object_or_404(Task, pk=request.POST['taskId'], project__pk=kwargs.get('project_id'))
        return super(ProjectAjax, self).dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        if (status := request.POST.get('status', None)) and status in self.base_statuses and self.task.status != status:
            self.task.status = request.POST['status']
            self.task.save()
            return JsonResponse({'success': True})
        if sprint_id := request.POST.get('sprintId', None):
            sprint = get_object_or_404(Sprint, pk=sprint_id, project__pk=kwargs.get('project_id'))
            if self.task.sprint != sprint:
                entries = ProjectLogEntry.objects.filter(
                    project=self.task.project, content_type=get_content_type_for_model(self.task),
                    object_id=self.task.pk, action_flag=2)
                entries = entries.last().pk if entries else 0
                last_entry = ProjectLogEntry.objects.last().pk
                if last_entry > entries:
                    self.task.sprint = sprint
                    self.task.save()
            return JsonResponse({'success': True})
        return JsonResponse({'success': False})
