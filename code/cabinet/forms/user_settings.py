from django import forms
from main.models import User

from . import BaseModelForm


class UserSettingsForm(BaseModelForm):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'command_invites')
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'command_invites': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
