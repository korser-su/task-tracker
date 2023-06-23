from django import forms

from . import BaseModelForm
from ..models import Role


class RoleForm(BaseModelForm):
    class Meta:
        model = Role
        fields = ('parent_role', 'name')
        widgets = {'name': forms.TextInput(attrs={'class': 'form-control'})}

    def __init__(self, project, *args, **kwargs):
        super(RoleForm, self).__init__(*args, **kwargs)
        query = Role.objects.filter(project=project)
        if self.instance:
            query = Role.objects.filter(project=project).exclude(pk=self.instance.pk)
        self.fields['parent_role'] = forms.ModelChoiceField(queryset=query, empty_label='Не выбрана',
                                                            label='Родительская роль',
                                                            help_text='Выберите роль, которая выше по иерархии',
                                                            required=False,
                                                            widget=forms.Select(attrs={'class': 'form-select'}))
