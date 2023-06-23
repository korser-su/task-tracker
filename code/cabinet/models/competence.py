from django.db import models


class Competence(models.Model):
    name = models.CharField(max_length=150, verbose_name='Название')
    created_at = models.DateTimeField(auto_created=True, auto_now_add=True, verbose_name='Дата создания')

    def __str__(self):
        return self.name

    class Meta(object):
        app_label = 'cabinet'
        db_table = 'competence'
        verbose_name = 'компетенция'
        verbose_name_plural = 'компетенции'
