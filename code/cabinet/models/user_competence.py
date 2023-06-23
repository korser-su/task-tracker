from django.conf import settings
from django.db import models


class UserCompetence(models.Model):
    competence = models.ForeignKey('Competence', on_delete=models.CASCADE, verbose_name='Компетенция')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='Пользователь')
    created_at = models.DateTimeField(auto_created=True, auto_now_add=True, verbose_name='Дата создания')

    def __str__(self):
        return self.competence.name

    class Meta(object):
        app_label = 'cabinet'
        db_table = 'user_competence'
        verbose_name = 'связь компетенции и пользователя'
        verbose_name_plural = 'связи компетенций и пользователей'
