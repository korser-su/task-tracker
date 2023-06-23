from django.contrib.auth.forms import PasswordChangeForm
from django import forms


class CustomPasswordChangeForm(PasswordChangeForm):
    template_name_div = 'forms/div.html'

    def __init__(self, *args, **kwargs):
        super(CustomPasswordChangeForm, self).__init__(*args, **kwargs)
        self.fields['old_password'].widget = forms.PasswordInput(attrs={'class': 'form-control'})
        self.fields['new_password1'].widget = forms.PasswordInput(attrs={'class': 'form-control'})
        self.fields['new_password2'].widget = forms.PasswordInput(attrs={'class': 'form-control'})

    def is_valid(self):
        result = super().is_valid()
        # loop on *all* fields if key '__all__' found else only on errors:
        for x in (self.fields if '__all__' in self.errors else self.errors):
            attrs = self.fields[x].widget.attrs
            attrs.update({'class': attrs.get('class', '') + ' is-invalid'})
        return result
