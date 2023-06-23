from django.conf import settings
from django.db import models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.urls import reverse

from cabinet.tools import create_log

statuses = (
    ('open', 'Открыта'),
    ('in-progress', 'В работе'),
    ('pause', 'В паузе'),
    ('stop', 'В стопе'),
    ('ready', 'Готово'),
    ('closed', 'Закрыта')
)

def get_task_list_tpl():
    tpl = {}
    for key, name in statuses:
        tpl[key] = {'title': name, 'tasks': []}
    return tpl

class Task(models.Model):
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='Создатель')
    project = models.ForeignKey('Project', on_delete=models.CASCADE, verbose_name='Проект')
    parent = models.ForeignKey('Task', on_delete=models.CASCADE, verbose_name='Родительская', null=True, blank=True)
    member = models.ForeignKey('Member', on_delete=models.DO_NOTHING, verbose_name='На кого назначена')
    status = models.CharField(choices=statuses, max_length=14, verbose_name='Статус')
    sprint = models.ForeignKey('Sprint', on_delete=models.SET_NULL, verbose_name='Спринт', null=True, blank=True)
    name = models.CharField(max_length=150, verbose_name='Название')
    content = models.TextField(verbose_name='Описание')
    created_at = models.DateField(auto_now_add=True, auto_created=True, verbose_name='Дата создания')
    checked_date = models.DateField(verbose_name='Дата проверки')

    def __str__(self):
        return self.name

    def status_to_view(self):
        match self.status:
            case 'open':
                return '<span class="badge bg-secondary">Открыта</span>'
            case 'in-progress':
                return '<span class="badge bg-success">В работе</span>'
            case 'pause':
                return '<span class="badge bg-warning">В паузе</span>'
            case 'stop':
                return '<span class="badge bg-danger">В стопе</span>'
            case 'open-test':
                return '<span class="badge bg-secondary">В очереди на тестирование</span>'
            case 'progress-test':
                return '<span class="badge bg-success">В работе тестирование</span>'
            case 'ready':
                return '<span class="badge bg-info">Готово</span>'
        return '<span class="badge bg-dark">Закрыта</span>'

    def kids(self):
        return Task.objects.filter(parent=self)

    def get_absolute_url(self):
        return reverse('cabinet:task-page', kwargs={'project_id': self.project.pk, 'task_id': self.pk})

    def get_update_url(self):
        return reverse('cabinet:task-update', kwargs={'project_id': self.project.pk, 'task_id': self.pk})

    def get_delete_url(self):
        return reverse('cabinet:task-delete', kwargs={'project_id': self.project.pk, 'task_id': self.pk})

    class Meta(object):
        app_label = 'cabinet'
        db_table = 'task'
        verbose_name = 'задача'
        verbose_name_plural = 'задачи'


@receiver(post_save, sender=Task)
def create_update_log(instance, created, **kwargs):
    if created: # is creation
        create_log(instance=instance, object_id=instance.pk, name=f'Задача {instance.name} создана', flag=1)
    else:
        create_log(instance=instance, object_id=instance.pk, name=f'Задача {instance.name} изменена', flag=2)

@receiver(pre_delete, sender=Task)
def delete_log(instance, **kwargs):
    create_log(instance=instance, object_id=instance.pk, name=f'Задача {instance.name} удалена', flag=3)
