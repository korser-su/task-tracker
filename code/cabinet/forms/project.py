from django import forms

from . import BaseModelForm
from ..models import Project


class ProjectForm(BaseModelForm):
    class Meta:
        model = Project
        fields = ('name', 'description')
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control'})
        }
