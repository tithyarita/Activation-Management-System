// Page Loader - Centralized page management for admin dashboard
export const pageLoader = {
    currentPage: null,
    pages: ['dashboard', 'campaigns', 'users', 'leaders', 'reports'],
    
    // Initialize the page loader
    async init() {
        try {
            await this.loadHeader();
            await this.loadWrapper();
            this.setupNavigation();
        } catch (err) {
            console.error('Error initializing page loader:', err);
        }
    },
    
    // Load header
    async loadHeader() {
        try {
            const placeholder = document.getElementById('header-placeholder');
            if (!placeholder) return;
            
            const response = await fetch('../component/header.html');
            if (!response.ok) throw new Error('Failed to fetch header');
            
            const html = await response.text();
            placeholder.innerHTML = html;
        } catch (err) {
            console.error('Error loading header:', err);
        }
    },
    
    // Load wrapper
    async loadWrapper() {
        try {
            const placeholder = document.getElementById('wrapper-placeholder');
            if (!placeholder) return;
            
            const response = await fetch('../component/admin-wrapper.html');
            if (!response.ok) throw new Error('Failed to fetch wrapper');
            
            const html = await response.text();
            placeholder.innerHTML = html;
        } catch (err) {
            console.error('Error loading wrapper:', err);
        }
    },
    
    // Setup navigation listeners
    setupNavigation() {
        // Delay to ensure DOM is updated
        setTimeout(() => {
            const navItems = document.querySelectorAll('[data-page]');
            navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const pageName = item.getAttribute('data-page');
                    if (pageName && this.pages.includes(pageName)) {
                        e.preventDefault();
                        this.loadPage(pageName);
                    }
                });
            });
        }, 100);
    },
    
    // Load a specific page
    async loadPage(pageName) {
        if (!this.pages.includes(pageName)) {
            console.error(`Page '${pageName}' not found`);
            return;
        }
        
        try {
            this.currentPage = pageName;
            
            // Update active navigation
            this.updateActiveNav(pageName);
            
            // Load page content
            const response = await fetch(`../pages/${pageName}-content.html`);
            if (!response.ok) throw new Error(`Failed to fetch ${pageName} content`);
            
            const html = await response.text();
            const contentDiv = document.getElementById('page-content');
            if (contentDiv) {
                contentDiv.innerHTML = html;
            }
            
            // Initialize page-specific code
            await this.initializePage(pageName);
            
        } catch (err) {
            console.error(`Error loading page '${pageName}':`, err);
            const contentDiv = document.getElementById('page-content');
            if (contentDiv) {
                contentDiv.innerHTML = '<p class="error-text">Failed to load page. Please try again.</p>';
            }
        }
    },
    
    // Update active navigation item
    updateActiveNav(pageName) {
        const navItems = document.querySelectorAll('[data-page]');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            }
        });
    },
    
    // Initialize page-specific JavaScript
    async initializePage(pageName) {
        try {
            // Map page names to their init functions
            const initFunctions = {
                'dashboard': 'initDashboard',
                'campaigns': 'initCampaigns',
                'users': 'initUsers',
                'leaders': 'initLeaders',
                'reports': 'initReports'
            };
            
            const initFuncName = initFunctions[pageName];
            if (!initFuncName) return;
            
            // Dynamically import the page module - relative to JS folder
            const module = await import(`./${pageName}.js`);
            const initFunc = module[initFuncName];
            
            if (typeof initFunc === 'function') {
                await initFunc();
            }
        } catch (err) {
            console.error(`Error initializing page '${pageName}':`, err);
        }
    }
};
