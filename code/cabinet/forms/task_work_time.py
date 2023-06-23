from django import forms

from . import BaseModelForm
from ..models import TaskWorkTime


class TaskWorkTimeForm(BaseModelForm):
    class Meta:
        model = TaskWorkTime
        fields = ('description', 'hours')
        widgets = {
            'description': forms.TextInput(attrs={'class': 'form-control'}),
            'hours': forms.NumberInput(attrs={'class': 'form-control', 'step': 0.1})
        }
