from django import forms
from django.db.models import Q

from . import BaseModelForm
from ..models import Sprint


class SprintForm(BaseModelForm):
    class Meta:
        model = Sprint
        fields = ('parent', 'name', 'start', 'end')
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'start': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}, format='%Y-%m-%d'),
            'end': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}, format='%Y-%m-%d')
        }

    def __init__(self, project, *args, **kwargs):
        super(SprintForm, self).__init__(*args, **kwargs)
        self.project = project
        query = Sprint.objects.filter(project=project)
        if self.instance:
            query = Sprint.objects.filter(project=project).exclude(pk=self.instance.pk)
        self.fields['parent'] = forms.ModelChoiceField(
            queryset=query, empty_label='Не выбран', required=False, label='Предшествующий спринт',
            help_text='Выберите предшествующий спринт. Имейте в виду, если этот спринт раньше использовался, то это добавит новый между имеющимся',
            widget=forms.Select(attrs={'class': 'form-select'})
        )

    def clean(self):
        cleaned_data = super(SprintForm, self).clean()
        if self.instance:
            sprints = Sprint.objects.filter(~Q(pk=self.instance.pk), start__lte=cleaned_data.get('start'),
                                            end__gte=cleaned_data.get('start'), project=self.project)
            if sprints.exists():
                self.add_error('start', 'Дата начала спринта не должна пересекаться с другими спринтами')
            sprints = Sprint.objects.filter(~Q(pk=self.instance.pk), start__lte=cleaned_data.get('end'),
                                            end__gte=cleaned_data.get('end'), project=self.project)
            if sprints.exists():
                self.add_error('end', 'Дата окончания спринта не должна пересекаться с другими спринтами')
        else:
            sprints = Sprint.objects.filter(start__lte=cleaned_data.get('start'), end__gte=cleaned_data.get('start'),
                                            project=self.project)
            if sprints.exists():
                self.add_error('start', 'Дата начала спринта не должна пересекаться с другими спринтами')
            sprints = Sprint.objects.filter(start__lte=cleaned_data.get('end'), end__gte=cleaned_data.get('end'),
                                            project=self.project)
            if sprints.exists():
                self.add_error('end', 'Дата окончания спринта не должна пересекаться с другими спринтами')
        return cleaned_data
