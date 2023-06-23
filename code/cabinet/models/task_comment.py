from django.conf import settings
from django.db import models
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from django.urls import reverse

from cabinet.tools import create_log


class TaskComment(models.Model):
    task = models.ForeignKey('Task', on_delete=models.CASCADE, verbose_name='Задача')
    parent = models.ForeignKey('TaskComment', on_delete=models.CASCADE, verbose_name='Родитель', null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, verbose_name='Автор')
    message = models.CharField(max_length=150, verbose_name='Комментарий')
    created_at = models.DateTimeField(auto_now_add=True, auto_created=True, verbose_name='Дата создания')

    def __str__(self):
        return f'{self.user}_{self.task.name}'

    def kids(self):
        return TaskComment.objects.filter(parent=self)

    def files(self):
        return self.file_set.filter(is_archived=False, comment=self)

    def create_url(self):
        return reverse('cabinet:task-comment-create', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk})

    def answer_url(self):
        return reverse('cabinet:task-comment-answer', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'comment_id': self.pk})

    def get_update_url(self):
        return reverse('cabinet:task-comment-update', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'comment_id': self.pk})

    def get_delete_url(self):
        return reverse('cabinet:task-comment-delete', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'comment_id': self.pk})

    def modal_answer_url(self):
        return reverse('cabinet:task-comment-answer-modal', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'comment_id': self.pk})

    def modal_get_update_url(self):
        return reverse('cabinet:task-comment-update-modal', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'comment_id': self.pk})

    def modal_get_delete_url(self):
        return reverse('cabinet:task-comment-delete-modal', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'comment_id': self.pk})

    class Meta(object):
        ordering = ['-created_at']
        app_label = 'cabinet'
        db_table = 'task_comment'
        verbose_name = 'комментарий к задаче'
        verbose_name_plural = 'комментарии к задачам'


@receiver(post_save, sender=TaskComment)
def create_update_log(instance, created, **kwargs):
    if created:
        create_log(instance=instance, object_id=instance.pk, name=f'Комментарий к задаче {instance.task.name} создан',
                   flag=1)
    else:
        create_log(instance=instance, object_id=instance.pk, name=f'Комментарий к задаче {instance.task.name} изменен',
                   flag=2)

@receiver(pre_delete, sender=TaskComment)
def delete_log(instance, **kwargs):
    create_log(instance=instance, object_id=instance.pk, name=f'Комментарий к задаче {instance.task.name} удален',
               flag=3)
