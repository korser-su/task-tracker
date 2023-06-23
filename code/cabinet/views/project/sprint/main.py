from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect

from cabinet.forms import SprintForm
from cabinet.models import Project, Sprint
from cabinet.models.task import get_task_list_tpl
from cabinet.views import BaseView, BaseDetailView, BaseCreateView, BaseUpdateView

from main.models import User


class SprintCreate(BaseCreateView):
    template_name = 'base_form.html'
    form_class = SprintForm
    project = None
    perm = 'project_sprint'

    def dispatch(self, request, *args, **kwargs):
        self.project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        self.extra_context = {'title': 'Создание спринта', 'project_id': kwargs.get('project_id')}
        return super(SprintCreate, self).dispatch(request, *args, **kwargs)

    def get_form(self, form_class=None):
        if form_class is None:
            form_class = self.get_form_class()
        return form_class(project=self.project, **self.get_form_kwargs())

    def form_valid(self, form):
        instance = form.save(commit=False)
        instance.project = self.project
        instance.save()
        messages.success(self.request, f'Спринт &laquo;{instance.name}&raquo; успешно создан')
        return redirect(self.request.POST.get('next', instance.get_absolute_url()))

class SprintUpdate(BaseUpdateView):
    template_name = 'base_form.html'
    form_class = SprintForm
    perm = 'project_sprint'

    def get_form(self, form_class=None):
        if form_class is None:
            form_class = self.get_form_class()
        return form_class(project=self.object.project, **self.get_form_kwargs())

    def get_object(self, queryset=None):
        sprint = get_object_or_404(Sprint, pk=self.kwargs.get('sprint_id'))
        self.extra_context = {
            'title': f'Изменение спринта &laquo;{sprint.name}&raquo;', 'project_id': self.kwargs.get('project_id')}
        return sprint

    def form_valid(self, form):
        instance = form.save()
        messages.success(self.request, f'Спринт &laquo;{instance.name}&raquo; успешно изменен')
        return redirect(self.request.POST.get('next', self.object.get_absolute_url()))


class SprintDelete(BaseView):
    http_method_names = ['get']
    perm = 'project_sprint'

    def get(self, request, *args, **kwargs):
        sprint = get_object_or_404(Sprint, pk=kwargs.get('sprint_id'))
        messages.error(request, f'Спринт &laquo;{sprint.name}&raquo; успешно удален')
        sprint.delete()
        return redirect('cabinet:project-page', project_id=kwargs.get('project_id'))


class SprintPage(BaseDetailView):
    model = Sprint
    pk_url_kwarg = 'sprint_id'
    context_object_name = 'sprint'
    template_name = 'project/sprint/page.html'
    project_id = 0

    def dispatch(self, request, *args, **kwargs):
        self.project_id = kwargs.get('project_id')
        return super(SprintPage, self).dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(SprintPage, self).get_context_data(**kwargs)
        context['admin_links'] = []
        if self.has_perm(perm='project_sprint'):
            context['admin_links'] = [{
                'url': self.object.get_delete_url(), 'class': 'nav-link fs-5 px-2',
                'get': self.object.modal_get_delete_url(), 'text': '<i class="bi bi-trash3-fill"></i>'
            }, {'url': self.object.get_update_url(), 'class': 'nav-link fs-5 px-2',
                'get': self.object.modal_get_update_url(), 'text': '<i class="bi bi-pencil"></i>'}]
        context['title'] = f'Задачи спринта &laquo;{self.object.name}&raquo;'
        context['project_id'] = self.project_id
        context['sprint_id'] = self.object.pk
        context['tasks'] = get_task_list_tpl()
        for task in self.object.task_set.order_by('checked_date'):
            context['tasks'][task.status]['tasks'].append(task)
        context['task_create'] = self.has_perm(perm='task_create')
        # Задействованные
        context['involved'] = [task.member.user for task in self.object.task_set.all()]
        context['involved'] = list(set(context['involved']))
        context['unused'] = User.objects.distinct('pk').filter(member__project=self.object.project).exclude(
            pk__in=[u.pk for u in context['involved']])
        return context
