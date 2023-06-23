from django.shortcuts import render, get_object_or_404

from cabinet.forms import TaskCommentForm
from cabinet.models import TaskComment
from cabinet.views import BaseView


class ModalCommentAnswer(BaseView):
    http_method_names = ['get']
    comment = None

    def has_perm(self, perm=None):
        return super(ModalCommentAnswer, self).has_perm(perm=perm) or self.request.user == self.comment.task.member.user \
            or self.request.user == self.comment.task.creator

    def dispatch(self, request, *args, **kwargs):
        self.comment = get_object_or_404(TaskComment, pk=kwargs.get('comment_id'))
        return super(ModalCommentAnswer, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return render(request, 'project/task/comment/modals/create.html', {
            'url': self.comment.create_url, 'comment_id': self.comment.pk, 'next': self.comment.task.get_absolute_url(),
            'form': TaskCommentForm()})


class ModalCommentUpdate(BaseView):
    http_method_names = ['get']
    comment = None
    perm = 'taskComment_update'

    def has_perm(self, perm=None):
        return super(ModalCommentUpdate, self).has_perm(perm=perm) or self.request.user == self.comment.user

    def dispatch(self, request, *args, **kwargs):
        self.comment = get_object_or_404(TaskComment, pk=kwargs.get('comment_id'))
        return super(ModalCommentUpdate, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return render(request, 'project/task/comment/modals/update.html', {
            'url': self.comment.get_update_url(), 'name': 'данные участника', 'next': self.comment.task.get_absolute_url(),
            'form': TaskCommentForm(instance=self.comment), 'files': self.comment.files()})


class ModalCommentDelete(BaseView):
    http_method_names = ['get']
    comment = None
    perm = 'taskComment_delete'

    def has_perm(self, perm=None):
        return super(ModalCommentDelete, self).has_perm(perm=perm) or self.request.user == self.comment.user

    def dispatch(self, request, *args, **kwargs):
        self.comment = get_object_or_404(TaskComment, pk=kwargs.get('comment_id'))
        return super(ModalCommentDelete, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return render(request,'modals/delete.html', {'url': self.comment.get_delete_url(), 'name': 'комментарий'})
