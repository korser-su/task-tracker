from django.db import models
from django.utils import timezone


class ProjectLogEntry(models.Model):
    action_time = models.DateTimeField('Время события', default=timezone.now, editable=False)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, verbose_name='Проект')
    content_type = models.ForeignKey('contenttypes.ContentType', models.SET_NULL, verbose_name='Тип сущности',
                                     blank=True, null=True)
    object_id = models.IntegerField(verbose_name='ID объекта', default=0)
    name = models.CharField(max_length=150, verbose_name='Название действия')
    fields = models.JSONField(null=True, blank=True)
    action_flag = models.PositiveSmallIntegerField('Тип события', choices=(
        (1, 'Создано'), (2, 'Изменено'), (3, 'Удалено')), default=1)

    class Meta(object):
        ordering = ['action_time']
        app_label = 'cabinet'
        db_table = 'project_log_entry'
        verbose_name = 'событие'
        verbose_name_plural = 'события'
