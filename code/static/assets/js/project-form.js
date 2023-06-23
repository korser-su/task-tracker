(() => {
    'use strict'
    let memberList = document.getElementById('member-list'),
        team = document.getElementById('team');
    memberList.addEventListener('click', function (e) {
        if (e.target) {
            let element = null;
            if (e.target.classList.contains('card')) element = e.target;
            else if (e.target.classList.contains('card-body')) element = e.target.parentElement;
            else return;
            team.appendChild(element);
        }
    });
    team.addEventListener('click', function (e) {
        if (e.target) {
            let element = null;
            if (e.target.classList.contains('card')) element = e.target;
            else if (e.target.classList.contains('card-body')) element = e.target.parentElement;
            else return;
            memberList.appendChild(element);
        }
    });
})();
