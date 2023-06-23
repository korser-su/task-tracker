from django.urls import path, include
from django.contrib.auth.decorators import login_required
from . import views

app_name = 'cabinet'

urlpatterns = [
    path('competence/ajax/', views.CompetenceAjax(), name='competence-ajax'),
    path('users/', include([  # Календарь
        path('', views.UserList(), name='users'),
        path('filter/', views.UserCompetenceFilter(), name='user-competence-filter'),
        path('<int:user_id>/', views.UserPage(), name='user-page'),
        path('<int:user_id>/create-member', views.UserInvite(), name='user-create-member'),
        path('<int:user_id>/member', views.ModalUserInvite(), name='user-modal-invite')
    ])),
    path('', include([
        # Проект
        path('', views.ProjectList(), name='projects'),
        path('modals/create/', views.ModalProjectCreate(), name='project-modals-create'),
        path('create/', views.ProjectCreate(), name='project-create'),
        path('<int:project_id>/', views.ProjectPage(), name='project-page'),
        path('<int:project_id>/history/', views.ProjectHistory(), name='project-history'),
        path('<int:project_id>/request/', views.ProjectRequest(), name='project-request'),
        path('<int:project_id>/request/delete', views.ProjectRequestDelete(), name='project-request-delete'),
        path('<int:project_id>/approve/', views.ProjectApprove(), name='project-approve'),
        path('<int:project_id>/disapprove/', views.ProjectDisapprove(), name='project-disapprove'),
        path('<int:project_id>/ajax/', views.ProjectAjax(), name='project-ajax'),
        path('<int:project_id>/update/', views.ProjectUpdate(), name='project-update'),
        path('<int:project_id>/delete/', views.ProjectDelete(), name='project-delete'),
        path('<int:project_id>/files/', include([  # Файлы
            path('<int:file_id>/', login_required(views.get_file), name='get-file')
        ])),
        path('<int:project_id>/modals/', include([  # Модальные окна
            path('update/', views.ModalProjectUpdate(), name='project-modal-update'),
            path('delete/', views.ModalProjectDelete(), name='project-modal-delete')
        ])),
        path('<int:project_id>/roles/', include([  # Роли
            path('', views.RoleList(), name='roles'),
            path('create/', views.RoleCreate(), name='role-create'),
            path('<int:role_id>/', include([
                path('', views.RolePage(), name='role-page'),
                path('update/', views.RoleUpdate(), name='role-update'),
                path('delete/', views.RoleDelete(), name='role-delete'),
                path('modals/delete/', views.ModalRoleDelete(), name='role-modal-delete'),
            ])),
        ])),
        path('<int:project_id>/members/', include([  # Сотрудники
            path('', views.MemberList(), name='members'),
            path('create/', views.MemberCreate(), name='member-create'),
            path('modals/create/', views.ModalMemberCreate(), name='member-modal-create'),
            path('<int:user_id>/', include([
                path('', views.MemberPage(), name='member-page'),
                path('accept/', views.MemberAccept(), name='member-accept'),
                path('decline/', views.MemberDecline(), name='member-decline'),
            ])),
            path('<int:member_id>/', include([
                path('', views.MemberPage(), name='member-page'),
                path('update/', views.MemberUpdate(), name='member-update'),
                path('delete/', views.MemberDelete(), name='member-delete'),
                path('modals/', include([
                    path('update/', views.ModalMemberUpdate(), name='member-modal-update'),
                    path('delete/', views.ModalMemberDelete(), name='member-modal-delete')
                ])),
            ])),
        ])),
        path('<int:project_id>/sprints/', include([
            path('create/', views.SprintCreate(), name='sprint-create'),
            path('modals/create/', views.ModalSprintCreate(), name='sprint-modal-create'),
            path('<int:sprint_id>/', include([
                path('', views.SprintPage(), name='sprint-page'),
                path('update/', views.SprintUpdate(), name='sprint-update'),
                path('delete/', views.SprintDelete(), name='sprint-delete'),
                path('modals/', include([
                    path('update/', views.ModalSprintUpdate(), name='sprint-modal-update'),
                    path('delete/', views.ModalSprintDelete(), name='sprint-modal-delete')
                ])),
            ])),
        ])),
        path('<int:project_id>/task/', include([
            path('', views.TaskList(), name='task-list'),
            path('create/', views.TaskCreate(), name='task-create'),
            path('<int:task_id>/', views.TaskPage(), name='task-page'),
            path('<int:task_id>/history/ajax', views.TaskHistoryListAjax(), name='task-history-ajax'),
            path('<int:task_id>/update/', views.TaskUpdate(), name='task-update'),
            path('<int:task_id>/delete/', views.TaskDelete(), name='task-delete'),
            # Списания времени
            path('<int:task_id>/time/', include([
                path('create/', views.TaskWorkCreate(), name='task-work-create'),
                path('ajax/', views.TaskWorkListAjax(), name='task-work-ajax'),
                path('<int:time_id>/', include([
                    path('update/', views.TaskWorkUpdate(), name='task-work-update'),
                    path('delete/', views.TaskWorkDelete(), name='task-work-delete'),
                    path('modals/', include([
                        path('update/', views.ModalTaskWorkUpdate(), name='task-work-update-modal'),
                        path('delete/', views.ModalTaskWorkDelete(), name='task-work-delete-modal'),
                    ]))
                ]))
            ])),
            # Комментарии к задачам
            path('<int:task_id>/comments/', include([
                path('create/', views.TaskCommentCreate(), name='task-comment-create'),
                path('ajax/', views.CommentTaskListAjax(), name='task-comment-ajax'),
                path('<int:comment_id>/', include([
                    path('answer/', views.TaskCommentAnswer(), name='task-comment-answer'),
                    path('update/', views.TaskCommentUpdate(), name='task-comment-update'),
                    path('delete/', views.TaskCommentDelete(), name='task-comment-delete'),
                    path('modals/', include([
                        path('answer/', views.ModalCommentAnswer(), name='task-comment-answer-modal'),
                        path('update/', views.ModalCommentUpdate(), name='task-comment-update-modal'),
                        path('delete/', views.ModalCommentDelete(), name='task-comment-delete-modal'),
                    ]))
                ]))
            ]))
        ])),
    ]))
]
