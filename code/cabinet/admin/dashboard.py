from django.utils.translation import gettext as _
from admin_tools.dashboard import modules, Dashboard

from cabinet.admin.modules import StatisticModule


class GlobalDashboard(Dashboard):
    columns = 4

    def __init__(self, **kwargs):
        super(GlobalDashboard, self).__init__(**kwargs)
        self.children.append(StatisticModule(title='Статистика'))
        # append an app list module for "Applications"
        self.children.append(modules.AppList(title=_('Applications'), exclude=('django.contrib.*',)))
        # append an app list module for "Administration"
        self.children.append(modules.AppList(title=_('Administration'), models=('django.contrib.*',)))
        # append a recent actions module
        self.children.append(modules.RecentActions(title=_('Recent Actions'), limit=10))
