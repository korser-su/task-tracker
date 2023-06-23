from django.contrib.admin.options import get_content_type_for_model
from django.db import models

def object_to_dict(obj):
    opts = obj._meta
    data = {}
    for f in opts.concrete_fields + opts.many_to_many:
        if isinstance(f, models.ManyToManyField):
            if obj.pk is None:
                data[f.name] = []
            else:
                data[f.name] = list(f.value_from_object(obj).values_list('pk', flat=True))
        elif isinstance(f, models.DateTimeField):
            if f.value_from_object(obj) is not None:
                data[f.name] = f.value_from_object(obj).strftime('%Y-%m-%d %H:%M')
        elif isinstance(f, models.DateField):
            if f.value_from_object(obj) is not None:
                data[f.name] = f.value_from_object(obj).strftime('%Y-%m-%d')
        elif isinstance(f, models.TimeField):
            if f.value_from_object(obj) is not None:
                data[f.name] = f.value_from_object(obj).strftime('%H:%M')
        elif isinstance(f, models.FileField):
            data[f.name] = ''
        else:
            data[f.name] = f.value_from_object(obj)
    return data


def create_log(instance, object_id, name, flag):
    from cabinet.models import ProjectLogEntry, Project, TaskComment, TaskWorkTime
    if isinstance(instance, Project):
        ProjectLogEntry.objects.create(project=instance, content_type=get_content_type_for_model(instance),
                                       object_id=object_id, fields=object_to_dict(instance), name=name, action_flag=flag)
    elif isinstance(instance, TaskComment) or isinstance(instance, TaskWorkTime):
        ProjectLogEntry.objects.create(project=instance.task.project, content_type=get_content_type_for_model(instance),
                                       object_id=object_id, fields=object_to_dict(instance), name=name, action_flag=flag)
    else:
        ProjectLogEntry.objects.create(project=instance.project, content_type=get_content_type_for_model(instance),
                                       object_id=object_id, fields=object_to_dict(instance), name=name, action_flag=flag)
