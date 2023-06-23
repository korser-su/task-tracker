from django.shortcuts import render, get_object_or_404

from cabinet.models import Role
from cabinet.views import BaseView


class ModalRoleDelete(BaseView):
    http_method_names = ['get']
    perm = 'role_delete'

    def get(self, request, *args, **kwargs):
        role = get_object_or_404(Role, project__member__user=request.user, project__pk=kwargs.get('project_id'),
                                 pk=kwargs.get('role_id'))
        return render(request,'modals/delete.html', {'url': role.get_delete_url(), 'name': 'роль'})
