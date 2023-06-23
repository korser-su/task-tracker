from django import forms

from . import BaseModelForm
from ..models import Task, Member


class TaskForm(BaseModelForm):
    class Meta:
        model = Task
        fields = ('parent', 'member', 'status', 'sprint', 'name', 'content', 'checked_date')
        widgets = {
            'status': forms.Select(attrs={'class': 'form-select'}),
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'content': forms.Textarea(attrs={'class': 'form-control'}),
            'checked_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}, format='%Y-%m-%d')
        }

    def __init__(self, project, *args, **kwargs):
        super(TaskForm, self).__init__(*args, **kwargs)

        parent = Task.objects.filter(project=project)
        if self.instance:
            parent = Task.objects.filter(project=project).exclude(pk=self.instance.pk)
        self.fields['parent'] = forms.ModelChoiceField(queryset=parent, empty_label='Не выбрана', required=False,
                                                       label='Родительская задача',
                                                       widget=forms.Select(attrs={'class': 'form-select'}))

        self.fields['sprint'] = forms.ModelChoiceField(queryset=project.sprint_set.all(), required=False,
                                                       empty_label='Не выбран', label='Спринт',
                                                       widget=forms.Select(attrs={'class': 'form-select'}))

        self.fields['member'] = forms.ModelChoiceField(
            queryset=Member.objects.filter(project=project).order_by('user', 'role'), label='Исполнитель',
            widget=forms.Select(attrs={'class': 'form-select'})
        )
