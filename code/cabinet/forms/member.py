from django import forms

from . import BaseModelForm
from ..models import Member, Role


class MemberForm(BaseModelForm):
    class Meta:
        model = Member
        fields = ('role', 'user')
        widgets = {
            'role': forms.Select(attrs={'class': 'form-select'}),
            'user': forms.Select(attrs={'class': 'form-select'})
        }

    def __init__(self, project, *args, **kwargs):
        super(MemberForm, self).__init__(*args, **kwargs)
        self.fields['role'] = forms.ModelChoiceField(queryset=Role.objects.filter(project=project),
                                                     empty_label='Не выбрана', label='Роль',
                                                     widget=forms.Select(attrs={'class': 'form-select'}))
