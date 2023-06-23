from django.db import models


class RoleCompetence(models.Model):
    project = models.ForeignKey('Project', on_delete=models.CASCADE, verbose_name='Проект')
    role = models.ForeignKey('Role', on_delete=models.CASCADE, verbose_name='Роль на проекте')
    competence = models.ForeignKey('Competence', on_delete=models.CASCADE, verbose_name='Компетенция')
    created_at = models.DateTimeField(auto_created=True, auto_now_add=True, verbose_name='Дата создания')

    def __str__(self):
        return self.competence.name

    class Meta(object):
        app_label = 'cabinet'
        db_table = 'role_competence'
        verbose_name = 'связь компетенции и роли'
        verbose_name_plural = 'связи компетенций и ролей'
