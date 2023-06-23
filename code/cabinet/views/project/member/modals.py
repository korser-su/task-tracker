from django.shortcuts import render, get_object_or_404
from django.urls import reverse

from cabinet.forms import MemberForm
from cabinet.models import Project, Member
from cabinet.views import BaseView


class ModalMemberCreate(BaseView):
    http_method_names = ['get']
    perm = 'member_create'

    def get(self, request, *args, **kwargs):
        project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        return render(request, 'modals/create.html', {
            'url': reverse('cabinet:member-create', kwargs={'project_id': project.pk}),
            'name': 'профиля нового участника', 'next': reverse('cabinet:members', kwargs={'project_id': project.pk}),
            'form': MemberForm(project=project)})


class ModalMemberUpdate(BaseView):
    http_method_names = ['get']
    perm = 'member_update'

    def get(self, request, *args, **kwargs):
        member = get_object_or_404(Member, project__pk=kwargs.get('project_id'), pk=kwargs.get('member_id'))
        return render(request, 'modals/update.html', {
            'url': member.get_update_url(), 'name': 'данные участника', 'next': member.get_absolute_url(),
            'form': MemberForm(project=member.project, instance=member)})


class ModalMemberDelete(BaseView):
    http_method_names = ['get']
    perm = 'member_delete'

    def get(self, request, *args, **kwargs):
        member = get_object_or_404(Member, project__pk=kwargs.get('project_id'), pk=kwargs.get('member_id'))
        return render(request,'modals/delete.html', {'url': member.get_delete_url(), 'name': 'участника'})
