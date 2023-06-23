from admin_tools.dashboard import modules

from cabinet.models import Competence, File, Project, Sprint, Task
from main.models import User


class StatisticModule(modules.DashboardModule):
    def is_empty(self):
        return False

    def __init__(self, **kwargs):
        super(StatisticModule, self).__init__(**kwargs)
        self.template = 'admin/modules/statistic.html'
        self.users_count = User.objects.count()
        self.competence_count = Competence.objects.count()
        self.file_count = File.objects.count()
        self.project_count = Project.objects.count()
        self.sprint_count = Sprint.objects.count()
        self.task_count = Task.objects.count()
