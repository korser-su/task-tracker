(() => {
    'use strict';
    // ==============================================================
    // This is for the top header part and sidebar part
    // ==============================================================
    let set = function() {
        if (localStorage.getItem('sidebar') === 'true') document.body.classList.add('mini-sidebar');
        else document.body.classList.remove('mini-sidebar');
        let topOffset = 70;
        let height = ((window.innerHeight > 0) ? window.innerHeight : this.screen.height) - 1;
        height = height - topOffset;
        if (height < 1) height = 1;
        if (height > topOffset) document.querySelector(".page-wrapper").style.minHeight = (height-1) + "px";
    };
    window.addEventListener('ready', set);
    window.addEventListener('resize', set);
    // ==============================================================
    // Theme options
    // ==============================================================
    document.querySelector('.sidebartoggler')?.addEventListener('click', function () {
        if (localStorage.getItem('sidebar') === 'true') localStorage.removeItem('sidebar');
        else localStorage.setItem('sidebar', 'true');
        set();
    });
    // ==============================================================
    // Auto select left navbar
    // ==============================================================
    let $sidebarNav = document.querySelectorAll('ul#sidebarnav a'), $flag = false;
    for (let i = $sidebarNav.length - 1; i > -1; i--) {
        if (!$flag) {
            let re = new RegExp($sidebarNav[i].href);
            if (re.test(window.location.href)) {
                $flag = true;
                $sidebarNav[i].classList.add('active');
                $sidebarNav[i].parentElement.classList.add('active');
            }
        }
    }
    // ==============================================================
    // Resize all elements
    // ==============================================================
    set();
    // ==============================================================
    // Auto select top navbar
    // ==============================================================
    let mainMenuLinks = document.querySelectorAll('.nav-inverse-tabs .nav-link');
    for (let i = 0; i < mainMenuLinks.length; i++) {
        if (window.location.href.indexOf(mainMenuLinks[i].href) !== -1) {
            document.querySelector('.nav-inverse-tabs .nav-link.active')?.classList.remove('active');
            mainMenuLinks[i].classList.toggle('active');
        }
    }
    document.addEventListener('htmx:responseError', (e) => {
        console.log(e)
        let errors = document.getElementById('errors');
        errors.innerHTML = '<div class="alert mt-3 alert-danger alert-dismissible">' + e.detail.error +
                        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>' + errors.innerHTML;
    });
    let modal = new bootstrap.Modal(document.getElementById('modal'));
    htmx.on("htmx:afterSwap", (e) => {
        if (e.detail.target.id === "modal") modal.show();
    });
    // Enable tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]'),
        tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
})();