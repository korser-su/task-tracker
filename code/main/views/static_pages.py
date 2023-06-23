from django.shortcuts import render


# Главная страница сайта
def index(request):
    return render(request, 'index.html', {})
