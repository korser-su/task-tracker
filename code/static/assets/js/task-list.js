(() => {
    'use strict'
    const taskListElements = document.querySelectorAll('.task-list'),
        ajaxError = document.getElementById('ajaxError');
    for (let i = 0; i < taskListElements.length; i++) {
        new Sortable(taskListElements[i], {
            group: 'taskList', animation: 150, sort: false, multiDrag: true, selectedClass: 'shadow',
            onAdd: (evt) => {
                console.log(evt)
                if (evt.items.length !== 0) {
                    for (let i = 0; i < evt.items.length; i++) {
                        changeTaskStatus(evt.items[i], evt.to);
                    }
                } else changeTaskStatus(evt.item, evt.to);
            },
            onMove: (evt, originalEvent) => {
                let request = new XMLHttpRequest(),
                    formData = new FormData();
                request.open('POST', window.location.pathname + 'ajax/');
                formData.append('csrfmiddlewaretoken', document.querySelector('meta[name="csrfmiddlewaretoken"]').content);
                if (evt.to.classList.contains('sprint')) {
                    request.onloadend = function () {
                        const response = JSON.parse(this.responseText);
                        if (response.success) {
                            ajaxError.innerHTML = '<div class="alert alert-success alert-dismissible mt-3">' +
                                'Задача прикреплена к спринту. ' +
                                '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                                '</div>';
                            evt.dragged.classList.remove('border-danger');
                            console.log(evt.dragged)
                            return false;
                        }
                    };
                    formData.append('sprintId', evt.to.dataset.sprintId);
                    formData.append('taskId', evt.dragged.dataset.taskId);
                    request.send(formData);
                    return false;
                }
            },
        });
    }
    const sprintElems = document.querySelectorAll('.sprint');
    for (let i = 0; i < sprintElems.length; i++) {
        new Sortable(sprintElems[i],{group: 'taskList', animation: 150});
    }
    function changeTaskStatus(item, target) {
        let request = new XMLHttpRequest(),
            formData = new FormData();
        request.open('POST', window.location.pathname + 'ajax/');
        request.onloadend = function () {
            const response = JSON.parse(this.responseText);
            if (!response.success) {
                ajaxError.innerHTML = '<div class="alert alert-danger alert-dismissible">' +
                    'Не удалось изменить статус задачи. Попробуйте обновить страницу, пожалуйста. ' +
                    '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                    '</div>';
            }
        };
        formData.append('csrfmiddlewaretoken', document.querySelector('meta[name="csrfmiddlewaretoken"]').content);
        formData.append('status', target.dataset.status);
        formData.append('taskId', item.dataset.taskId);
        request.send(formData);
    }
})();