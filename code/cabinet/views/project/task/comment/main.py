from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404, redirect, render

from cabinet.forms import TaskCommentForm
from cabinet.models import TaskComment, Task, File
from cabinet.views import BaseView, BaseCreateView, BaseUpdateView


class TaskCommentAnswer(BaseView):
    template_name = 'project/task/comment/form.html'
    comment = None
    perm = 'taskComment_create'

    def has_perm(self, perm=None):
        return super(TaskCommentAnswer, self).has_perm(perm=perm) or self.request.user == self.comment.task.member.user \
            or self.request.user == self.comment.task.creator

    def dispatch(self, request, *args, **kwargs):
        self.comment = get_object_or_404(TaskComment, pk=kwargs.get('comment_id'))
        return super(TaskCommentAnswer, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return render(request, self.template_name, {
            'url': self.comment.create_url, 'title': 'Ответ на комментарий', 'project_id': kwargs.get('project_id'),
            'comment_id': self.comment.pk, 'form': TaskCommentForm(instance=self.comment)})


class TaskCommentCreate(BaseCreateView):
    template_name = 'project/task/comment/form.html'
    form_class = TaskCommentForm
    task = None
    perm = 'taskComment_create'

    def has_perm(self, perm=None):
        return super(TaskCommentCreate, self).has_perm(perm=perm) or self.request.user == self.task.member.user \
            or self.request.user == self.task.creator

    def dispatch(self, request, *args, **kwargs):
        self.task = get_object_or_404(Task, pk=kwargs.get('task_id'))
        self.extra_context = {'title': 'Создание комментария', 'project_id': kwargs.get('project_id')}
        return super(TaskCommentCreate, self).dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        instance = form.save(commit=False)
        instance.task = self.task
        if 'parent' in self.request.POST:
            try:
                instance.parent = TaskComment.objects.get(pk=self.request.POST['parent'], task=self.task)
            except ObjectDoesNotExist:
                instance.parent = None
                messages.error(self.request, 'Родительский комментарий не найден, комментарий создан без него')
        try:
            instance.user = self.request.user
            instance.save()
            messages.success(self.request, 'Комментарий успешно добавлен')
            for file in self.request.FILES.getlist('files'):
                f = File.objects.create(project=self.task.project, comment=instance, user=self.request.user)
                f.file.save(file.name, ContentFile(file.read()))
            return redirect(self.task.get_absolute_url())
        except ObjectDoesNotExist:
            messages.error(self.request, 'Не удалось добавить Ваш комментарий, вероятно Вас удалили из компании')
            return redirect('cabinet:projects')


class TaskCommentUpdate(BaseUpdateView):
    template_name = 'project/task/comment/form.html'
    form_class = TaskCommentForm
    perm = 'taskComment_update'

    def has_perm(self, perm=None):
        return super(TaskCommentUpdate, self).has_perm(perm=perm) or self.request.user == self.object.user

    def get_object(self, queryset=None):
        comment = get_object_or_404(TaskComment, pk=self.kwargs.get('comment_id'))
        self.extra_context = {
            'title': 'Обновление комментария',
            'project_id': self.kwargs.get('project_id'),
            'files': File.objects.filter(is_archived=False, comment=comment)
        }
        return comment

    def form_valid(self, form):
        instance = form.save()
        if 'parent' in self.request.POST:
            try:
                instance.parent = TaskComment.objects.get(pk=self.request.POST['parent'], task=self.object.task)
            except ObjectDoesNotExist:
                instance.parent = None
                messages.error(self.request, 'Родительский комментарий не найден, комментарий создан без него')
            instance.save()
        File.objects.filter(comment=self.object).exclude(pk__in=self.request.POST.getlist('file_ids')).update(is_archived=True)
        for file in self.request.FILES.getlist('files'):
            f = File.objects.create(project=self.object.task.project, comment=instance, user=self.request.user)
            f.file.save(file.name, ContentFile(file.read()))
        messages.success(self.request, 'Комментарий успешно изменен')
        return redirect(self.object.task.get_absolute_url())


class TaskCommentDelete(BaseView):
    http_method_names = ['get']
    comment = None
    perm = 'taskComment_delete'

    def has_perm(self, perm=None):
        return super(TaskCommentDelete, self).has_perm(perm=perm) or self.request.user == self.comment.user

    def dispatch(self, request, *args, **kwargs):
        self.comment = get_object_or_404(TaskComment, pk=kwargs.get('comment_id'))
        return super(TaskCommentDelete, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        self.comment.delete()
        messages.error(request, 'Комментарий успешно удален')
        return redirect('cabinet:task-page', project_id=kwargs.get('project_id'), task_id=kwargs.get('task_id'))
