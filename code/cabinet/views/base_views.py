from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.http import Http404
from django.views import View
from django.views.generic import CreateView, UpdateView
from django.views.generic.detail import SingleObjectTemplateResponseMixin, SingleObjectMixin
from django.views.generic.list import MultipleObjectTemplateResponseMixin, MultipleObjectMixin
from django.utils.translation import gettext as _

from cabinet.models import Project


class Base:
    request = None
    kwargs = None
    perm = None

    def has_perm(self, perm=None):
        try:
            project = Project.objects.get(pk=self.kwargs.get('project_id'))
            if project.user == self.request.user:
                return True
            members = project.member_set.filter(user=self.request.user, is_approved=True)
            if not perm:
                perm = self.perm
            if perm:
                # 0 - основной раздел прав 1 - требуемое право
                perm = perm.split('_')
                for m in members:
                    for perm_ in m.role.permissions:
                        if perm[0] == perm_ and perm[1] in m.role.permissions[perm[0]]:
                            return True
            elif members:
                return True
            return self.request.user.is_staff
        except ObjectDoesNotExist:
            return True

class BaseView(View, Base):
    http_method_names = ['get', 'post']

    @method_decorator(login_required)
    def __call__(self, request, *args, **kwargs):
        self.setup(request, *args, **kwargs)
        return self.dispatch(request, *args, **kwargs)

    def dispatch(self, request, *args, **kwargs):
        if not self.has_perm(perm=self.perm):
            raise PermissionDenied('У вас нет доступа к данному разделу')
        return super(BaseView, self).dispatch(request, *args, **kwargs)

class BaseCreateView(CreateView, Base):
    http_method_names = ['get', 'post']

    @method_decorator(login_required)
    def __call__(self, request, *args, **kwargs):
        self.setup(request, *args, **kwargs)
        return self.dispatch(request, *args, **kwargs)

    def dispatch(self, request, *args, **kwargs):
        if not self.has_perm(perm=self.perm):
            raise PermissionDenied('У вас нет доступа к данному разделу')
        return super(BaseCreateView, self).dispatch(request, *args, **kwargs)


class BaseUpdateView(UpdateView, Base):
    http_method_names = ['get', 'post']

    @method_decorator(login_required)
    def __call__(self, request, *args, **kwargs):
        self.setup(request, *args, **kwargs)
        return self.dispatch(request, *args, **kwargs)

    def dispatch(self, request, *args, **kwargs):
        if not self.has_perm(perm=self.perm):
            raise PermissionDenied('У вас нет доступа к данному разделу')
        return super(BaseUpdateView, self).dispatch(request, *args, **kwargs)


class BaseListView(MultipleObjectTemplateResponseMixin, MultipleObjectMixin, BaseView):
    http_method_names = ['get']
    object_list = None

    def get(self, request, *args, **kwargs):
        self.object_list = self.get_queryset()
        allow_empty = self.get_allow_empty()

        if not allow_empty:
            if self.get_paginate_by(self.object_list) is not None and hasattr(self.object_list, 'exists'):
                is_empty = not self.object_list.exists()
            else:
                is_empty = not self.object_list
            if is_empty:
                raise Http404(
                    _('Empty list and “%(class_name)s.allow_empty” is False.')
                    % {'class_name': self.__class__.__name__,}
                )
        context = self.get_context_data()
        return self.render_to_response(context)


class BaseDetailView(SingleObjectTemplateResponseMixin, SingleObjectMixin, BaseView):
    http_method_names = ['get']
    object = None

    def get(self, request, *args, **kwargs):
        self.object = self.get_object()
        context = self.get_context_data(object=self.object)
        return self.render_to_response(context)
