from django import forms
from django_registration import validators
from django_registration.forms import RegistrationFormUniqueEmail
from django.utils.translation import gettext_lazy as _

from cabinet.forms import BaseModelForm
from ..models import User


validators.CONFUSABLE = _(
    'Данное имя пользователя не может быть зарегистрировано. '
    'Пожалуйста, выберите другое для регистрации.'
)
validators.CONFUSABLE_EMAIL = _(
    'Данный адрес электронной почты не может быть зарегистрирован. '
    'Пожалуйста, выберите другой для регистрации.'
)
validators.DUPLICATE_EMAIL = _(
    'Данный адрес электронной почты уже используется другим пользователем. '
    'Выберите, пожалуйста, другой адрес электронной почты.'
)
validators.DUPLICATE_USERNAME = _('Пользователь с данным именем пользователя уже существует.')
validators.FREE_EMAIL = _(
    'Регистрация с использование бесплатный адресов электронной почты запрещена. '
    'Выберите, пожалуйста, другой адрес электронной почты.'
)
validators.RESERVED_NAME = _('Данное имя пользователя зарезервировано и не может использоваться при регистрации.')
validators.TOS_REQUIRED = _('Вы должны дать согласие на передачу и обработку персональных данных.')


class CustomRegistrationForm(RegistrationFormUniqueEmail, BaseModelForm):
    field_order = ['username', 'email', 'password1', 'password2']

    class Meta:
        model = User
        fields = {'username', 'email', 'password1', 'password2'}
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'})
        }

    def __init__(self, *args, **kwargs):
        super(CustomRegistrationForm, self).__init__(*args, **kwargs)
        self.fields['password1'].widget = forms.PasswordInput(attrs={'class': 'form-control'})
        self.fields['password2'].widget = forms.PasswordInput(attrs={'class': 'form-control'})
