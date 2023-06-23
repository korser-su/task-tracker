from django.contrib import admin
from django.contrib.admin.models import LogEntry

from cabinet.models import *

class SprintInline(admin.TabularInline):
    model = Sprint
    extra = 1

class RoleCompetenceInline(admin.TabularInline):
    model = RoleCompetence
    extra = 1

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    inlines = RoleCompetenceInline,

class RoleInline(admin.StackedInline):
    model = Role
    extra = 1


class MemberInline(admin.TabularInline):
    model = Member
    extra = 1


class TaskCommentInline(admin.StackedInline):
    model = TaskComment
    extra = 1


class TaskWorkTimeInline(admin.StackedInline):
    model = TaskWorkTime
    extra = 1


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    inlines = [TaskCommentInline, TaskWorkTimeInline]
    list_display = ['project', 'name', 'creator', 'member', 'created_at']
    list_filter = ['project', 'creator', 'created_at', 'sprint', 'project']

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    inlines = [RoleInline, MemberInline, SprintInline]
    list_display = ['name', 'user', 'created_at']
    list_filter = ['user', 'created_at']

admin.site.register(Sprint)
admin.site.register(Competence)
admin.site.register(UserCompetence)
admin.site.register(File)
admin.site.register(LogEntry)

@admin.register(ProjectLogEntry)
class ProjectLogAdmin(admin.ModelAdmin):
    list_filter = ['action_time', 'project']
    list_display = ['name', 'project', 'action_time']
