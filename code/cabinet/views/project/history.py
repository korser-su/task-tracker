from django.shortcuts import get_object_or_404

from cabinet.models import ProjectLogEntry, Project
from cabinet.views import BaseListView

class ProjectHistory(BaseListView):
    model = ProjectLogEntry
    template_name = 'history/page.html'
    context_object_name = 'activity'
    paginate_by = 20

    def get_queryset(self):
        return ProjectLogEntry.objects.filter(project__pk=self.kwargs.get('project_id'))

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        project = get_object_or_404(Project, pk=self.kwargs.get('project_id'))
        context['title'] = f'История действий проекта &laquo;{project.name}&raquo;'
        context['project_id'] = project.pk
        return context
