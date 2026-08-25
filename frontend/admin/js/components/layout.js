document.addEventListener("DOMContentLoaded", () => {
    // Injeta a Navbar
    const navbarPlaceholder = document.getElementById("navbar-placeholder");
    if (navbarPlaceholder) {
        fetch("./components/navbar.html")
            .then(response => response.text())
            .then(html => navbarPlaceholder.innerHTML = html);
    }

    // Injeta a Sidebar e marca o link ativo
    const sidebarPlaceholder = document.getElementById("sidebar-placeholder");
    if (sidebarPlaceholder) {
        fetch("./components/sidebar.html")
            .then(response => response.text())
            .then(html => {
                sidebarPlaceholder.innerHTML = html;
                
                // Lógica para marcar o menu ativo baseado na URL
                let currentPage = window.location.pathname.split('/').pop();
                if (currentPage === '' || currentPage === '/') currentPage = 'analise.html';

                const activeLink = document.querySelector(`.sidebar-menu a[href="${currentPage}"]`);
                if (activeLink) {
                    activeLink.parentElement.classList.add('active');
                }
            });
    }
});