from django.conf import settings
from django.db import models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.urls import reverse

from cabinet.tools import create_log


class TaskWorkTime(models.Model):
    task = models.ForeignKey('Task', on_delete=models.CASCADE, verbose_name='Задача')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, verbose_name='Кто списал')
    description = models.CharField(max_length=150, verbose_name='Описание работ')
    hours = models.FloatField(default=0, verbose_name='Затраченные на работу часы')
    created_at = models.DateTimeField(auto_now_add=True, auto_created=True, verbose_name='Дата создания')

    def __str__(self):
        return f'{self.user}_{self.task.name} {self.hours}'

    def get_update_url(self):
        return reverse('cabinet:task-work-update', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'time_id': self.pk})

    def get_delete_url(self):
        return reverse('cabinet:task-work-delete', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'time_id': self.pk})

    def modal_get_update_url(self):
        return reverse('cabinet:task-work-update-modal', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'time_id': self.pk})

    def modal_get_delete_url(self):
        return reverse('cabinet:task-work-delete-modal', kwargs={
            'project_id': self.task.project.pk, 'task_id': self.task.pk, 'time_id': self.pk})

    class Meta(object):
        ordering = ['-created_at']
        app_label = 'cabinet'
        db_table = 'task_work_time'
        verbose_name = 'списание времени в задаче'
        verbose_name_plural = 'списания времени в задачах'


@receiver(post_save, sender=TaskWorkTime)
def create_update_log(instance, created, **kwargs):
    if created: # is creation
        create_log(instance=instance, object_id=instance.pk, flag=1,
                   name=f'Списание времени к задаче {instance.task.name} создано')
    else:
        create_log(instance=instance, object_id=instance.pk, flag=2,
                   name=f'Списание времени к задаче {instance.task.name} изменено')

@receiver(pre_delete, sender=TaskWorkTime)
def delete_log(instance, **kwargs):
    create_log(instance=instance, object_id=instance.pk, name=f'Списание времени к задаче {instance.task.name} удалено',
               flag=3)