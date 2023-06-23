from django.contrib.admin.options import get_content_type_for_model

from cabinet.forms import TaskCommentForm, TaskWorkTimeForm
from cabinet.models import TaskComment, TaskWorkTime, ProjectLogEntry, Task
from cabinet.views import BaseListView


class CommentTaskListAjax(BaseListView):
    model = TaskComment
    template_name = 'project/task/comment/ajax.html'
    context_object_name = 'comments'
    extra_context = {'form': TaskCommentForm()}

    def get_context_data(self, **kwargs):
        context = super(CommentTaskListAjax, self).get_context_data(**kwargs)
        context['project_id'] = self.kwargs.get('project_id')
        context['task_id'] = self.kwargs.get('task_id')
        return context

    def get_queryset(self):
        return TaskComment.objects.filter(
            task__project__pk=self.kwargs.get('project_id'), task__pk=self.kwargs.get('task_id'), parent=None)


class TaskWorkListAjax(BaseListView):
    model = TaskComment
    template_name = 'project/task/work-time/ajax.html'
    context_object_name = 'times'
    extra_context = {'form': TaskWorkTimeForm()}

    def get_context_data(self, **kwargs):
        context = super(TaskWorkListAjax, self).get_context_data(**kwargs)
        context['project_id'] = self.kwargs.get('project_id')
        context['task_id'] = self.kwargs.get('task_id')
        return context

    def get_queryset(self):
        return TaskWorkTime.objects.filter(task__project__pk=self.kwargs.get('project_id'),
                                           task__pk=self.kwargs.get('task_id'))


class TaskHistoryListAjax(BaseListView):
    model = TaskComment
    template_name = 'project/task/history/ajax.html'
    context_object_name = 'logs'

    def get_queryset(self):
        return ProjectLogEntry.objects.filter(
            project__pk=self.kwargs.get('project_id'), object_id=self.kwargs.get('task_id'),
            content_type=get_content_type_for_model(Task))
