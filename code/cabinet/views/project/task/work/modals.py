from django.core.exceptions import PermissionDenied
from django.shortcuts import render, get_object_or_404

from cabinet.forms import TaskWorkTimeForm
from cabinet.models import TaskWorkTime
from cabinet.views import BaseView


class ModalTaskWorkUpdate(BaseView):
    http_method_names = ['get']
    task_work = None

    def dispatch(self, request, *args, **kwargs):
        self.task_work = get_object_or_404(TaskWorkTime, pk=kwargs.get('time_id'), task__pk=kwargs.get('task_id'),
                                           task__project__pk=kwargs.get('project_id'))
        if not (self.has_perm(perm='taskTime_update') or request.user == self.task_work.user):
            raise PermissionDenied('У вас нет доступа к изменению временных списаний')
        return super(ModalTaskWorkUpdate, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return render(request, 'modals/update.html', {
            'url': self.task_work.get_update_url(), 'name': 'временных затрат', 'next': self.task_work.task.get_absolute_url(),
            'form': TaskWorkTimeForm(instance=self.task_work)})


class ModalTaskWorkDelete(BaseView):
    http_method_names = ['get']
    task_work = None

    def dispatch(self, request, *args, **kwargs):
        self.task_work = get_object_or_404(TaskWorkTime, pk=kwargs.get('time_id'), task__pk=kwargs.get('task_id'),
                                           task__project__pk=kwargs.get('project_id'))
        if not (self.has_perm(perm='taskTime_delete') or request.user == self.task_work.user):
            raise PermissionDenied('У вас нет доступа к удалению временных затрат')
        return super(ModalTaskWorkDelete, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return render(request,'modals/delete.html', {'url': self.task_work.get_delete_url(), 'name': 'временные списания'})
