/**
 * f2b-dashboard Landing Page — Main script
 * Handles theme toggle, language toggle, mobile nav, and scroll effects
 */

(function () {
  'use strict';

  const THEME_KEY = 'f2b-landing-theme';

  // ============================================================
  // Theme
  // ============================================================
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    icon.textContent = theme === 'dark' ? '\u2600' : '\u263E';
  }

  // ============================================================
  // Language
  // ============================================================
  function initLanguageToggle() {
    const btn = document.getElementById('lang-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (window.landingI18n) {
        landingI18n.toggleLanguage();
      }
    });
  }

  // ============================================================
  // Mobile navigation
  // ============================================================
  function initMobileNav() {
    const toggle = document.getElementById('mobile-nav-toggle');
    const navLinks = document.getElementById('header-nav-links');
    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('header__nav-links--open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.textContent = isOpen ? '\u2715' : '\u2630';
    });

    // Close mobile menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('header__nav-links--open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '\u2630';
      });
    });
  }

  // ============================================================
  // Header scroll effect
  // ============================================================
  function initHeaderScroll() {
    const header = document.getElementById('main-header');
    if (!header) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 10) {
            header.classList.add('header--scrolled');
          } else {
            header.classList.remove('header--scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ============================================================
  // Smooth scroll for anchor links
  // ============================================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ============================================================
  // Initialize
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguageToggle();
    initMobileNav();
    initHeaderScroll();
    initSmoothScroll();

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    if (window.landingI18n) {
      landingI18n.init();
    }
  });
})();
