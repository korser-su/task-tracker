from django.db import models
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from django.urls import reverse

from cabinet.tools import create_log


class Role(models.Model):
    project = models.ForeignKey('Project', on_delete=models.CASCADE, verbose_name='Проект')
    parent_role = models.ForeignKey('Role', on_delete=models.CASCADE, verbose_name='Родитель', blank=True, null=True)
    name = models.CharField(max_length=150, verbose_name='Название')
    permissions = models.JSONField(verbose_name='Набор флагов доступа')
    created_at = models.DateTimeField(auto_created=True, auto_now_add=True, verbose_name='Дата создания')

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('cabinet:role-page', kwargs={'project_id': self.project.pk, 'role_id': self.pk})

    def get_update_url(self):
        return reverse('cabinet:role-update', kwargs={'project_id': self.project.pk, 'role_id': self.pk})

    def get_delete_url(self):
        return reverse('cabinet:role-delete', kwargs={'project_id': self.project.pk, 'role_id': self.pk})

    def modal_get_delete_url(self):
        return reverse('cabinet:role-modal-delete', kwargs={'project_id': self.project.pk, 'role_id': self.pk})

    def kids(self):
        return Role.objects.filter(parent_role=self)

    class Meta(object):
        app_label = 'cabinet'
        db_table = 'role'
        verbose_name = 'роль'
        verbose_name_plural = 'роли'

@receiver(post_save, sender=Role)
def create_update_log(instance, created, **kwargs):
    if created:
        create_log(instance=instance, object_id=instance.pk, name=f'Создана роль {instance.name}', flag=1)
    else:
        create_log(instance=instance, object_id=instance.pk, name=f'Роль {instance.name} в проекте изменено', flag=2)

@receiver(pre_delete, sender=Role)
def delete_log(instance, **kwargs):
    create_log(instance=instance, object_id=instance.pk, name=f'Роль {instance.title} из проекта удалена', flag=3)
