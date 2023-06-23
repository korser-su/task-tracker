from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import get_object_or_404, redirect

from cabinet.forms import TaskWorkTimeForm
from cabinet.models import Task, TaskWorkTime
from cabinet.views import BaseView, BaseCreateView, BaseUpdateView


class TaskWorkCreate(BaseCreateView):
    template_name = 'base_form.html'
    form_class = TaskWorkTimeForm
    task = None
    perm = 'taskTime_create'

    def has_perm(self, perm=None):
        return super(TaskWorkCreate, self).has_perm(perm=perm) or self.request.user == self.task.member.user

    def dispatch(self, request, *args, **kwargs):
        self.task = get_object_or_404(Task, pk=kwargs.get('task_id'))
        self.extra_context = {'title': 'Создание временных затрат', 'project_id': kwargs.get('project_id')}
        return super(TaskWorkCreate, self).dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        instance = form.save(commit=False)
        instance.task = self.task
        try:
            instance.user = self.request.user
            instance.save()
            messages.success(self.request, 'Время успешно добавлено')
            return redirect(self.task.get_absolute_url())
        except ObjectDoesNotExist:
            messages.error(self.request, 'Не удалось зачесть Ваш отчет, вероятно Вас удалили из компании')
            return redirect('cabinet:projects')


class TaskWorkUpdate(BaseUpdateView):
    template_name = 'base_form.html'
    form_class = TaskWorkTimeForm
    perm = 'taskTime_update'

    def has_perm(self, perm=None):
        return super(TaskWorkUpdate, self).has_perm(perm=perm) or self.request.user == self.object.user

    def get_object(self, queryset=None):
        task_work = get_object_or_404(TaskWorkTime, pk=self.kwargs.get('time_id'))
        self.extra_context = {'title': 'Обновление временных затрат', 'project_id': self.kwargs.get('project_id')}
        return task_work

    def form_valid(self, form):
        form.save()
        messages.success(self.request, 'Время успешно изменено')
        return redirect(self.object.task.get_absolute_url())


class TaskWorkDelete(BaseView):
    http_method_names = ['get']
    task_work = None
    perm = 'taskTime_delete'

    def has_perm(self, perm=None):
        return super(TaskWorkDelete, self).has_perm(perm=perm) or self.request.user == self.task_work.user

    def dispatch(self, request, *args, **kwargs):
        self.task_work = get_object_or_404(TaskWorkTime, pk=kwargs.get('time_id'))
        return super(TaskWorkDelete, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        self.task_work.delete()
        messages.error(request, 'Время успешно удалено')
        return redirect('cabinet:task-page', project_id=kwargs.get('project_id'), task_id=kwargs.get('task_id'))
