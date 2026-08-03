const fs = require('fs');

let html = fs.readFileSync('AplikasiPenjualan.html', 'utf8');

// Extract CSS
const styleRegex = /<style>([\s\S]*?)<\/style>/;
const styleMatch = html.match(styleRegex);
if (styleMatch) {
    let cssContent = styleMatch[1].trim();
    // Append mobile responsiveness
    cssContent += `

/* MOBILE RESPONSIVE */
.mobile-nav-toggle {
    display: none;
    background: var(--brand);
    color: white;
    border: none;
    padding: 12px 16px;
    font-size: 16px;
    width: 100%;
    text-align: left;
    cursor: pointer;
    position: sticky;
    top: 0;
    z-index: 998;
}
.mobile-nav-toggle .ic {
    margin-right: 8px;
}

@media (max-width: 768px) {
    .mobile-nav-toggle {
        display: block;
    }
    .app {
        flex-direction: column;
    }
    .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        z-index: 1000;
    }
    .sidebar.show {
        transform: translateX(0);
    }
    .main {
        margin-left: 0;
        padding: 14px;
        max-width: 100vw;
    }
    .cards {
        grid-template-columns: 1fr;
    }
    .grid2, .grid3 {
        grid-template-columns: 1fr;
    }
    .table-responsive {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        width: 100%;
    }
    table.grid, table.items {
        min-width: 600px;
    }
    .sidebar-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 999;
    }
    .sidebar-overlay.show {
        display: block;
    }
}
`;
    fs.writeFileSync('style.css', cssContent);
    html = html.replace(styleRegex, '<link rel="stylesheet" href="style.css">');
}

// Extract JS
const scriptRegex = /<script>([\s\S]*?)<\/script>/;
const scriptMatch = html.match(scriptRegex);
if (scriptMatch) {
    let jsContent = scriptMatch[1].trim();
    // Add mobile toggle logic
    jsContent += `

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    var toggleBtn = document.getElementById('mobileNavToggle');
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        });
    }

    overlay.addEventListener('click', function() {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    });

    // Close sidebar when a nav button is clicked on mobile
    var navButtons = document.querySelectorAll('.nav button');
    navButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
            }
        });
    });

    // Wrap tables for responsiveness
    function wrapTables() {
        document.querySelectorAll('table.grid, table.items').forEach(function(table) {
            if (!table.parentElement.classList.contains('table-responsive')) {
                var wrapper = document.createElement('div');
                wrapper.className = 'table-responsive';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }
    
    // Create an observer to wrap tables when they are dynamically added to #main
    var observer = new MutationObserver(function(mutations) {
        wrapTables();
    });
    var mainEl = document.getElementById('main');
    if(mainEl) {
        observer.observe(mainEl, { childList: true, subtree: true });
    }
});
`;
    fs.writeFileSync('script.js', jsContent);
    html = html.replace(scriptRegex, '<script src="script.js"></script>');
}

// Add mobile button to HTML
if (!html.includes('id="mobileNavToggle"')) {
    html = html.replace('<div class="app">', '<button id="mobileNavToggle" class="mobile-nav-toggle"><span class="ic">☰</span> Menu</button>\\n    <div class="app">');
}

fs.writeFileSync('AplikasiPenjualan.html', html);
console.log('Split completed successfully.');
