from django.conf import settings
from django.db import models
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from django.urls import reverse

from cabinet.tools import create_log


class Member(models.Model):
    project = models.ForeignKey('Project', on_delete=models.CASCADE, verbose_name='Проект')
    role = models.ForeignKey('Role', on_delete=models.CASCADE, verbose_name='Роль')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='Пользователь')
    is_approved = models.BooleanField(default=False, verbose_name='Сотрудник принял приглашение?')
    is_entry = models.BooleanField(default=False, verbose_name='Это заявка на вступление?')
    created_at = models.DateTimeField(auto_created=True, auto_now_add=True, verbose_name='Дата создания')

    def __str__(self):
        return f'{self.user.__str__()} в роли {self.role.name}'

    def get_absolute_url(self):
        return reverse('cabinet:member-page', kwargs={'project_id': self.project.pk, 'user_id': self.user.pk})

    def get_update_url(self):
        return reverse('cabinet:member-update', kwargs={'project_id': self.project.pk, 'member_id': self.pk})

    def get_delete_url(self):
        return reverse('cabinet:member-delete', kwargs={'project_id': self.project.pk, 'member_id': self.pk})

    def modal_get_update_url(self):
        return reverse('cabinet:member-modal-update', kwargs={'project_id': self.project.pk, 'member_id': self.pk})

    def modal_get_delete_url(self):
        return reverse('cabinet:member-modal-delete', kwargs={'project_id': self.project.pk, 'member_id': self.pk})

    class Meta(object):
        app_label = 'cabinet'
        db_table = 'member'
        verbose_name = 'участник'
        verbose_name_plural = 'участники'

@receiver(post_save, sender=Member)
def create_update_log(instance, created, **kwargs):
    if created:
        msg = f'Участник проекта {instance.user.__str__()} создан'
        if not instance.is_approved and instance.is_entry:
            msg = f'Заявка на вступление в проект от пользователя {instance.user.__str__()}'
        create_log(instance=instance, object_id=instance.pk, name=msg, flag=1)
    else:
        msg = f'Профиль участника проекта {instance.user.__str__()} изменен'
        if instance.is_approved and instance.is_entry == False:
            msg = f'Заявка на вступление от пользователя {instance.user.__str__()} одобрена'
        create_log(instance=instance, object_id=instance.pk, name=msg, flag=2)

@receiver(pre_delete, sender=Member)
def delete_log(instance, **kwargs):
    msg = f'Участник проекта {instance.user.__str__()} удален'
    if not instance.is_approved and instance.is_entry:
        msg = f'Заявка на вступления от пользователя {instance.user.__str__()} была удалена'
    create_log(instance=instance, object_id=instance.pk, name=msg, flag=3)
