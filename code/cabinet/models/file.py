from django.conf import settings
from django.db import models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.urls import reverse

from cabinet.tools import create_log


def directory_path(instance, filename):
    if instance.task:
        return 'tasks/{0}/{1}'.format(instance.task.id, filename)
    return 'comments/{0}/{1}'.format(instance.comment.id, filename)


class File(models.Model):
    project = models.ForeignKey('Project', on_delete=models.CASCADE, verbose_name='Проект')
    task = models.ForeignKey('Task', on_delete=models.SET_NULL, verbose_name='Задача', null=True, blank=True)
    comment = models.ForeignKey('TaskComment', on_delete=models.SET_NULL, verbose_name='Комментарий',
                                null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, verbose_name='Кто залил',
                             null=True, blank=True)
    file = models.FileField(verbose_name='Файл', upload_to=directory_path)
    is_archived = models.BooleanField(default=False, verbose_name='Файл архивирован?')
    created_at = models.DateTimeField(auto_created=True, auto_now_add=True, verbose_name='Дата создания')

    def __str__(self):
        return self.file.name.split("/")[-1]

    def get_absolute_url(self):
        if self.task:
            return reverse('cabinet:get-file', kwargs={'project_id': self.task.project.pk, 'file_id': self.pk})
        return reverse('cabinet:get-file', kwargs={'project_id': self.comment.task.project.pk, 'file_id': self.pk})

    class Meta(object):
        app_label = 'cabinet'
        db_table = 'file'
        verbose_name = 'файл'
        verbose_name_plural = 'файлы'


@receiver(post_save, sender=File)
def create_update_log(instance, created, **kwargs):
    if created:
        msg = 'Файл создан'
        if instance.task:
            msg = f'Файл к задаче {instance.task.name} прикреплен'
        if instance.comment:
            msg = 'Файл прикреплен к комментарию'
        create_log(instance=instance, object_id=instance.pk, name=msg, flag=1)
    else:
        msg = 'Файл изменен'
        if instance.is_archived:
            msg = 'Файл заархивирован'
        create_log(instance=instance, object_id=instance.pk, name=msg, flag=2)

@receiver(pre_delete, sender=File)
def delete_log(instance, **kwargs):
    create_log(instance=instance, object_id=instance.pk, name='Файл удален', flag=3)
