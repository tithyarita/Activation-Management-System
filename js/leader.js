const navItems = document.querySelectorAll('.navBar li');
const pages = document.querySelectorAll('.page');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Switch nav active
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Show page
        const pageId = item.dataset.page; // e.g., "attendance"
        pages.forEach(p => {
            p.classList.toggle('active', p.id === pageId); // only the clicked page becomes active
        });
    });
});

// Show default page
document.querySelector('.navBar li.active').click();
