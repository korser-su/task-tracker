from django.core.management.base import BaseCommand
import requests

from cabinet.models import Competence


class Command(BaseCommand):
    help = 'Collect competence'

    # Притворяемся человеком
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0",
        "Accept": "*/*"
    }

    # Собираем для демонстрации компетенции с хабр карьеры
    def handle(self, *args, **options):
        chars = 'abcdefghijklmnopqrstuvwxyzабвгдеёжзийклмнопрстуфхцчшщъыьэюя'
        for char in chars:
            response = requests.get(url=f'https://career.habr.com/api/frontend/suggestions/skills?term={char}',
                                    headers=self.headers)
            response = response.json()
            for c in response['list']:
                Competence.objects.get_or_create(name=c['title'])
