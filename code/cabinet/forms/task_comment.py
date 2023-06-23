from django import forms

from . import BaseModelForm
from ..models import TaskComment


class TaskCommentForm(BaseModelForm):
    class Meta:
        model = TaskComment
        fields = ('message',)
        widgets = {'message': forms.TextInput(attrs={'class': 'form-control'})}
