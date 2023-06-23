from django.core.exceptions import ObjectDoesNotExist
from django.http import FileResponse, Http404

from cabinet.models import File


def get_file(request, project_id, file_id):
    try:
        file = File.objects.distinct('pk').get(pk=file_id, task__project__pk=project_id,
                                               task__project__member__user=request.user)
    except ObjectDoesNotExist:
        try:
            file = File.objects.distinct('pk').get(pk=file_id, comment__task__project__pk=project_id,
                                                   comment__task__project__member__user=request.user)
        except ObjectDoesNotExist:
            raise Http404('Файл не найден')
    response = FileResponse(file.file.open())
    response["Content-Disposition"] = f'attachment; filename="{file.file.name.split("/")[-1]}"'
    return response
