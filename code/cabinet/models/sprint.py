from datetime import date

from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.db.models import Q
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from django.urls import reverse

from cabinet.tools import create_log


class Sprint(models.Model):
    parent = models.ForeignKey('Sprint', on_delete=models.SET_NULL, verbose_name='Родитель', null=True, blank=True)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, verbose_name='Проект')
    name = models.CharField(max_length=150, verbose_name='Название')
    start = models.DateField(verbose_name='Начало')
    end = models.DateField(verbose_name='Конец')
    created_at = models.DateTimeField(auto_created=True, auto_now_add=True, verbose_name='Дата создания')

    def __str__(self):
        return self.name

    def is_end_past_due(self):
        return self.start <= date.today() <= self.end

    def get_absolute_url(self):
        return reverse('cabinet:sprint-page', kwargs={'project_id': self.project.pk, 'sprint_id': self.pk})

    def get_update_url(self):
        return reverse('cabinet:sprint-update', kwargs={'project_id': self.project.pk, 'sprint_id': self.pk})

    def get_delete_url(self):
        return reverse('cabinet:sprint-delete', kwargs={'project_id': self.project.pk, 'sprint_id': self.pk})

    def modal_get_update_url(self):
        return reverse('cabinet:sprint-modal-update', kwargs={'project_id': self.project.pk, 'sprint_id': self.pk})

    def modal_get_delete_url(self):
        return reverse('cabinet:sprint-modal-delete', kwargs={'project_id': self.project.pk, 'sprint_id': self.pk})

    def child(self):
        try:
            return Sprint.objects.get(parent=self)
        except ObjectDoesNotExist:
            return None

    class Meta(object):
        app_label = 'cabinet'
        db_table = 'sprint'
        verbose_name = 'спринт'
        verbose_name_plural = 'спринты'


@receiver(post_save, sender=Sprint)
def create_update_log(instance, created, **kwargs):
    if instance.parent:
        try:
            prev_child = Sprint.objects.get(~Q(pk=instance.pk), parent=instance.parent)
            prev_child.parent = instance
            prev_child.save()
        except ObjectDoesNotExist:
            pass

    if created:
        create_log(instance=instance, object_id=instance.pk, name=f'Спринт {instance.name} создан', flag=1)
    else:
        create_log(instance=instance, object_id=instance.pk, name=f'Спринт {instance.name} изменен', flag=2)

@receiver(pre_delete, sender=Sprint)
def delete_log(instance, **kwargs):
    create_log(instance=instance, object_id=instance.pk, name=f'Спринт {instance.name} удален', flag=3)
