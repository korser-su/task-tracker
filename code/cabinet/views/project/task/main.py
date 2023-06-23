from django.contrib import messages
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404, redirect
from django.template.loader import render_to_string
from django.urls import reverse

from cabinet.forms import TaskForm
from cabinet.models import Task, Project, File
from cabinet.models.task import get_task_list_tpl
from cabinet.views import BaseListView, BaseDetailView, BaseView, BaseCreateView, BaseUpdateView


class TaskList(BaseListView):
    model = Task
    template_name = 'project/task/list.html'
    context_object_name = 'tasks'
    extra_context = {'title': 'Все задачи'}
    project = None

    def dispatch(self, request, *args, **kwargs):
        self.project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        return super(TaskList, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        context['tasks'] = get_task_list_tpl()
        for task in self.project.task_set.all():
            context['tasks'][task.status]['tasks'].append(task)
        context['project_id'] = self.kwargs.get('project_id')
        if self.has_perm(perm='task_create'):
            context['admin_links'] = [{
                'url': reverse('cabinet:task-create', kwargs={'project_id': self.kwargs.get('project_id')}),
                'class': 'nav-link fs-5 px-2', 'text': '<i class="bi bi-plus-lg"></i> Создать задачу'}]
        return context


class TaskPage(BaseDetailView):
    model = Task
    pk_url_kwarg = 'task_id'
    context_object_name = 'task'
    template_name = 'project/task/page.html'

    def get_context_data(self, **kwargs):
        context = super(TaskPage, self).get_context_data(**kwargs)
        context['admin_links'] = []
        context['modals'] = []
        if self.has_perm(perm='task_delete') or self.request.user == self.object.creator:
            context['admin_links'].append({
                'url': self.object.get_delete_url(), 'class': 'nav-link fs-5 px-2', 'modal_id': 'deleteModal',
                'text': '<i class="bi bi-trash3-fill"></i> Удалить'})
            context['modals'].append(render_to_string(
                'modals/delete.html', {'id': 'deleteModal', 'url': context['admin_links'][-1]['url'],
                                       'name': 'задачу'}))
        if self.has_perm(perm='task_update') or self.request.user == self.object.creator:
            context['admin_links'].append({'url': self.object.get_update_url(), 'class': 'nav-link fs-5 px-2',
                                           'text': '<i class="bi bi-pencil"></i>'})
        context['title'] = f'Задача проекта &laquo;{self.object.name}&raquo;'
        context['project_id'] = self.kwargs.get('project_id')
        context['files'] = self.object.file_set.filter(is_archived=False)
        return context


class TaskCreate(BaseCreateView):
    template_name = 'project/task/form.html'
    form_class = TaskForm
    project = None
    perm = 'task_create'

    def get_form(self, form_class=None):
        if form_class is None:
            form_class = self.get_form_class()
        return form_class(project=self.project, **self.get_form_kwargs())

    def dispatch(self, request, *args, **kwargs):
        self.project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        self.extra_context = {
            'title': f'Создание задачи для проекта &laquo;{self.project.name}&raquo;',
            'project_id': kwargs.get('project_id'),
        }
        return super(TaskCreate, self).dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        instance = form.save(commit=False)
        instance.creator = self.request.user
        instance.project = self.project
        instance.content = instance.content.replace('=', '&equals;')
        instance.save()
        for file in self.request.FILES.getlist('files'):
            f = File.objects.create(project=self.project, task=instance, user=self.request.user)
            f.file.save(file.name, ContentFile(file.read()))
        messages.success(self.request, f'Задача &laquo;{instance.name}&raquo; успешно добавлена в проект'
                                       f' &laquo;{self.project.name}&raquo;')
        return redirect(self.request.POST.get('next',instance.get_absolute_url()))


class TaskUpdate(BaseUpdateView):
    template_name = 'project/task/form.html'
    form_class = TaskForm
    perm = 'task_update'

    def has_perm(self, perm=None):
        return super(TaskUpdate, self).has_perm(perm=perm) or self.request.user == self.object.creator

    def get_form(self, form_class=None):
        if form_class is None:
            form_class = self.get_form_class()
        return form_class(project=self.object.project, **self.get_form_kwargs())

    def get_object(self, queryset=None):
        task = get_object_or_404(Task, pk=self.kwargs.get('task_id'))
        self.extra_context = {
            'title': f'Обновление задачи &laquo;{task.name}&raquo;',
            'project_id': self.kwargs.get('project_id'),
            'files': File.objects.filter(is_archived=False, task=task)
        }
        return task

    def form_valid(self, form):
        instance = form.save(commit=False)
        instance.content = instance.content.replace('=', '&equals;')
        instance.save()
        File.objects.filter(task=instance).exclude(pk__in=self.request.POST.getlist('file_ids')).update(is_archived=True)
        for file in self.request.FILES.getlist('files'):
            f = File.objects.create(project=self.object.project, task=instance, user=self.request.user)
            f.file.save(file.name, ContentFile(file.read()))
        messages.success(self.request, f'Задача &laquo;{instance.name}&raquo; успешно обновлена в проекте'
                                       f' &laquo;{self.object.project.name}&raquo;')
        return redirect(self.request.POST.get('next', self.object.get_absolute_url()))


class TaskDelete(BaseView):
    http_method_names = ['get']
    task = None
    perm = 'task_delete'

    def has_perm(self, perm=None):
        return super(TaskDelete, self).has_perm(perm=perm) or self.request.user == self.task.creator

    def dispatch(self, request, *args, **kwargs):
        self.task = get_object_or_404(Task, pk=kwargs.get('task_id'))
        return super(TaskDelete, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        messages.error(
            request, f'Задача &laquo;{self.task.name}&raquo; из проекта &laquo;{self.task.project.name}&raquo; удалена')
        self.task.delete()
        return redirect('cabinet:project-page', project_id=kwargs.get('project_id'))
