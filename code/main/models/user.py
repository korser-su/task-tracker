from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Sum

from cabinet.models import Task, TaskWorkTime


def user_directory_path(instance, filename):
    return f'photos/{instance.id}/{filename}'


class User(AbstractUser):
    photo = models.FileField(verbose_name='Фото профиля', upload_to=user_directory_path, null=True, blank=True)
    command_invites = models.BooleanField(default=True, help_text='Доступен ли для приглашений в команду?',
                                          verbose_name='Разрешить высылать приглашения в команду?')

    def __str__(self):
        if self.first_name or self.last_name:
            return f'{self.last_name} {self.first_name}'
        return self.email

    def projects(self):
        return self.member_set.distinct('project').count()

    def tasks(self):
        return Task.objects.filter(member__user=self).count()

    def work_time(self):
        return TaskWorkTime.objects.filter(user=self).aggregate(Sum('hours'))['hours__sum']

    class Meta(object):
        app_label = 'main'
        db_table = 'main_user'
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
