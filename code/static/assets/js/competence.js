(() => {
    "use strict"

    htmx.on("htmx:afterSwap", () => {
        (document.querySelectorAll('.dropdown-item[data-id]') || []).forEach(($trigger) => {
            $trigger.addEventListener('click', () => {
                let hiddenInput = document.querySelector('input[name="competence"][value="'+$trigger.dataset.id+'"]');
                if (typeof(hiddenInput) === 'undefined' || hiddenInput === null) {
                    let cmpDiv = document.createElement('div');
                    cmpDiv.classList.add('btn', 'btn-warning', 'mx-1');
                    cmpDiv.innerText = $trigger.innerText;
                    cmpDiv.addEventListener('click', () => {
                        cmpDiv.remove();
                    })
                    let input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'competence';
                    input.value = $trigger.dataset.id;
                    cmpDiv.appendChild(input);
                    document.getElementById('usedCompetence').appendChild(cmpDiv);
                    $trigger.remove();
                    let competenceName = document.querySelector('input[name="chars"]');
                    competenceName.value = '';
                    document.querySelector('#competences .competence').innerHTML = '';
                }
            });
        });
    });
    (document.querySelectorAll('#usedCompetence .button') || []).forEach(($trigger) => {
        $trigger.addEventListener('click', () => {
            $trigger.remove();
        });
    });
})();