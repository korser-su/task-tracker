from django.shortcuts import render

from cabinet.models import Competence
from cabinet.views import BaseView


class CompetenceAjax(BaseView):
    http_method_names = ['post']

    def post(self, request, *args, **kwargs):
        competences = None
        if chars := request.POST.get('chars'):
            competences = Competence.objects.filter(name__contains=chars)
            if existed_competence := request.POST.getlist('competence'):
                competences = competences.exclude(pk__in=existed_competence)
        return render(request, 'competence.html', {'competences': competences})
