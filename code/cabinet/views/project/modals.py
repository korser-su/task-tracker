from django.shortcuts import render, get_object_or_404
from django.urls import reverse

from cabinet.forms import ProjectForm
from cabinet.models import Project
from cabinet.views import BaseView


class ModalProjectCreate(BaseView):
    http_method_names = ['get']

    def get(self, request, *args, **kwargs):
        return render(request, 'modals/create.html', {
            'url': reverse('cabinet:project-create'), 'name': 'проекта',
            'next': reverse('cabinet:projects'), 'form': ProjectForm()})


class ModalProjectUpdate(BaseView):
    http_method_names = ['get']
    project = None
    perm = 'project_update'

    def dispatch(self, request, *args, **kwargs):
        self.project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        return super(ModalProjectUpdate, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return render(request, 'modals/update.html', {
            'url': self.project.get_update_url(), 'name': 'проект', 'next': self.project.get_absolute_url(),
            'form': ProjectForm(instance=self.project)})


class ModalProjectDelete(BaseView):
    http_method_names = ['get']
    project = None
    perm = 'project_delete'

    def dispatch(self, request, *args, **kwargs):
        self.project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        return super(ModalProjectDelete, self).dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return render(request, 'modals/delete.html', {'url': self.project.get_delete_url(), 'name': 'проект'})
