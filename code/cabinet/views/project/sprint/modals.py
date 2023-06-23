from django.shortcuts import render, get_object_or_404
from django.urls import reverse

from cabinet.forms import SprintForm
from cabinet.models import Project, Sprint
from cabinet.views import BaseView


class ModalSprintCreate(BaseView):
    http_method_names = ['get']
    perm = 'project_sprint'

    def get(self, request, *args, **kwargs):
        project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        return render(request, 'modals/create.html', {
            'id': 'createModal', 'url': reverse('cabinet:sprint-create', kwargs={'project_id': project.pk}),
            'name': 'спринта', 'next': project.get_absolute_url(), 'form': SprintForm(project=project)})


class ModalSprintUpdate(BaseView):
    http_method_names = ['get']
    perm = 'project_sprint'

    def get(self, request, *args, **kwargs):
        sprint = get_object_or_404(Sprint, pk=self.kwargs.get('sprint_id'))
        return render(request, 'modals/update.html', {
            'url': sprint.get_update_url(), 'name': 'спринта', 'next': sprint.get_absolute_url(),
            'form': SprintForm(project=sprint.project, instance=sprint)})


class ModalSprintDelete(BaseView):
    http_method_names = ['get']
    perm = 'project_sprint'

    def get(self, request, *args, **kwargs):
        sprint = get_object_or_404(Sprint, pk=self.kwargs.get('sprint_id'))
        return render(request,'modals/delete.html', {'url': sprint.get_delete_url(), 'name': 'спринт'})
