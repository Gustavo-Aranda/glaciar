document.addEventListener("DOMContentLoaded", () => {
    // Injeta a Navbar
    const navbarPlaceholder = document.getElementById("navbar-placeholder");
    if (navbarPlaceholder) {
        fetch("./components/navbar.html")
            .then(response => response.text())
            .then(html => navbarPlaceholder.innerHTML = html);
    }
});