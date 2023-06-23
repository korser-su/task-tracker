from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse

from cabinet.forms import RoleForm
from cabinet.models import Project, Role, Competence, RoleCompetence
from cabinet.views import BaseListView, BaseView, BaseDetailView, BaseCreateView, BaseUpdateView

# Приватный метод только для классов в данном файле
def _get_permissions(request):
    return {
        'role': '_'.join(request.POST.getlist('role', '')),
        'member': '_'.join(request.POST.getlist('member', '')),
        'project': '_'.join(request.POST.getlist('project', '')),
        'task': '_'.join(request.POST.getlist('task', '')),
        'taskComment': '_'.join(request.POST.getlist('taskComment', '')),
        'taskTime': '_'.join(request.POST.getlist('taskTime', '')),
        'rate': '_'.join(request.POST.getlist('rate', '')),
    }

# Классы-вьюшки
class RoleList(BaseListView):
    model = Role
    project = None
    context_object_name = 'roles'
    template_name = 'role/list.html'

    def dispatch(self, request, *args, **kwargs):
        self.project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        return super(RoleList, self).dispatch(request, *args, **kwargs)

    def get_queryset(self):
        return Role.objects.filter(project=self.project, parent_role=None)

    def get_context_data(self, *, object_list=None, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.has_perm(perm='role_create'):
            context['admin_links'] = [{
                'url': reverse('cabinet:role-create', kwargs={'project_id': self.kwargs.get('project_id')}),
                'class': 'nav-link fs-5 px-2', 'text': '<i class="bi bi-plus-lg"></i>'}]
        context['title'] = 'Все роли'
        context['project_id'] = self.kwargs.get('project_id')
        context['project'] = self.project
        return context


class RoleCreate(BaseCreateView):
    template_name = 'role/form.html'
    form_class = RoleForm
    project = None
    perm = 'role_create'

    def get_form(self, form_class=None):
        if form_class is None:
            form_class = self.get_form_class()
        return form_class(project=self.project, **self.get_form_kwargs())

    def dispatch(self, request, *args, **kwargs):
        self.project = get_object_or_404(Project, pk=kwargs.get('project_id'))
        self.extra_context = {'title': 'Создание роли', 'project_id': kwargs.get('project_id')}
        return super(RoleCreate, self).dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        instance = form.save(commit=False)
        instance.project = self.project
        instance.permissions = _get_permissions(request=self.request)
        instance.save()
        for c_id in self.request.POST.getlist('competence'):
            try:
                RoleCompetence.objects.create(project=self.project, competence=Competence.objects.get(pk=c_id),
                                              role=instance)
            except ObjectDoesNotExist:
                continue
        messages.success(self.request, f'Роль &laquo;{instance.name}&raquo; успешно создана')
        return redirect(self.request.POST.get('next', instance.get_absolute_url()))


class RoleUpdate(BaseUpdateView):
    template_name = 'role/form.html'
    form_class = RoleForm
    role = None
    perm = 'role_update'

    def dispatch(self, request, *args, **kwargs):
        self.role = get_object_or_404(Role, pk=kwargs.get('role_id'))
        return super(RoleUpdate, self).dispatch(request, *args, **kwargs)

    def get_form(self, form_class=None):
        if form_class is None:
            form_class = self.get_form_class()
        return form_class(project=self.object.project, **self.get_form_kwargs())

    def get_object(self, queryset=None):
        role = get_object_or_404(Role, project__pk=self.kwargs.get('project_id'), pk=self.kwargs.get('role_id'))
        self.extra_context = {
            'title': f'Изменение роли &laquo;{self.role.name}&raquo;',
            'project_id': self.kwargs.get('project_id'),
            'competences': self.role.rolecompetence_set.all(),
        }
        return role

    def form_valid(self, form):
        instance = form.save(commit=False)
        instance.permissions = _get_permissions(request=self.request)
        instance.save()

        self.role.rolecompetence_set.all().delete()
        for c_id in self.request.POST.getlist('competence'):
            try:
                RoleCompetence.objects.create(project=self.role.project, competence=Competence.objects.get(pk=c_id),
                                              role=self.role)
            except ObjectDoesNotExist:
                continue

        messages.success(self.request, f'Роль &laquo;{instance.name}&raquo; успешно изменена')
        return redirect(self.request.POST.get('next', self.role.get_absolute_url()))


class RoleDelete(BaseView):
    http_method_names = ['get']
    perm = 'role_delete'

    def get(self, request, *args, **kwargs):
        messages.error(request, 'Роль успешно удалена')
        get_object_or_404(Role, project__member__user=request.user, project__pk=kwargs.get('project_id'),
                          pk=kwargs.get('role_id')).delete()
        return redirect('cabinet:roles', project_id=kwargs.get('project_id'))


class RolePage(BaseDetailView):
    model = Role
    pk_url_kwarg = 'role_id'
    context_object_name = 'role'
    template_name = 'role/page.html'
    perm = 'role_read'

    def get_context_data(self, **kwargs):
        context = super(RolePage, self).get_context_data(**kwargs)
        context['admin_links'] = []
        if self.has_perm(perm='role_delete'):
            context['admin_links'].append({'url': self.object.get_delete_url(), 'class': 'nav-link fs-5 px-2',
                                           'get': self.object.modal_get_delete_url(), 'text': '<i class="bi bi-trash3-fill"></i>'})
        if self.has_perm(perm='role_update'):
            context['admin_links'].append({'url': self.object.get_update_url(), 'class': 'nav-link fs-5 px-2',
                                           'text': '<i class="bi bi-pencil"></i>'})
        if self.has_perm(perm='member_create'):
            context['admin_links'].append({
                'url': reverse('cabinet:member-create', kwargs={'project_id': self.kwargs.get('project_id')}), 'class': 'nav-link fs-5 px-2',
                'get': reverse('cabinet:member-modal-create', kwargs={'project_id': self.object.project.pk}),
                'text': '<i class="bi bi-plus-lg"></i> Добавить сотрудника'})
        context['title'] = f'Роль &laquo;{self.object.name}&raquo; в проекте'
        context['project_id'] = self.kwargs.get('project_id')
        context['form'] = RoleForm(instance=self.object, project=self.object.project)
        return context
