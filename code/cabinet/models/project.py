from django.conf import settings
from django.db import models
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from django.urls import reverse

from cabinet.tools import create_log


class Project(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='Кто создал')
    name = models.CharField(max_length=150, verbose_name='Название проекта')
    description = models.TextField(verbose_name='Описание проекта', help_text='Несколько предложений')
    is_archived = models.BooleanField(default=False, verbose_name='Проект архивирован?')
    created_at = models.DateTimeField(auto_created=True, auto_now_add=True, verbose_name='Дата создания')

    def __str__(self):
        return self.name

    def approve_url(self):
        return reverse('cabinet:project-approve', kwargs={'project_id': self.pk})

    def disapprove_url(self):
        return reverse('cabinet:project-disapprove', kwargs={'project_id': self.pk})

    def get_absolute_url(self):
        return reverse('cabinet:project-page', kwargs={'project_id': self.pk})

    def get_update_url(self):
        return reverse('cabinet:project-update', kwargs={'project_id': self.pk})

    def get_delete_url(self):
        return reverse('cabinet:project-delete', kwargs={'project_id': self.pk})

    def modal_get_update_url(self):
        return reverse('cabinet:project-modal-update', kwargs={'project_id': self.pk})

    def modal_get_delete_url(self):
        return reverse('cabinet:project-modal-delete', kwargs={'project_id': self.pk})

    class Meta(object):
        app_label = 'cabinet'
        db_table = 'project'
        verbose_name = 'проект'
        verbose_name_plural = 'проекты'

@receiver(post_save, sender=Project)
def create_update_log(instance, created, **kwargs):
    if created:
        create_log(instance=instance, object_id=instance.pk, name=f'Проект {instance.name} создан', flag=1)
    else:
        msg = f'Проект {instance.name} изменен'
        if instance.is_archived:
            msg = f'Проект {instance.name} заархивирован'
        create_log(instance=instance, object_id=instance.pk, name=msg, flag=2)

@receiver(pre_delete, sender=Project)
def delete_log(instance, **kwargs):
    create_log(instance=instance, object_id=instance.pk, name=f'Проект {instance.title} удален', flag=3)
