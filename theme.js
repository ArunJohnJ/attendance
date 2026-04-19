// Apply saved theme immediately to prevent any flash
const savedTheme = localStorage.getItem('theme');
const isLightDefault = savedTheme ? savedTheme === 'light' : true; // default: light
document.documentElement.classList.toggle('light', isLightDefault);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getThemeEls() {
    return {
        moon: document.getElementById('icon-moon'),
        sun: document.getElementById('icon-sun'),
        // attendance.html uses 'theme-toggle-label'; all others use 'theme-label'
        label: document.getElementById('theme-label') ?? document.getElementById('theme-toggle-label'),
    };
}

function applyTheme(isLight) {
    const {moon, sun, label} = getThemeEls();
    moon?.style && (moon.style.display = isLight ? '' : 'none');
    sun?.style && (sun.style.display = isLight ? 'none' : '');
    label && (label.textContent = isLight ? 'Dark' : 'Light');
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => applyTheme(isLightDefault));

// ── Public API ────────────────────────────────────────────────────────────────

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    applyTheme(isLight);
}
