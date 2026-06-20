/**
 * i18n - Lightweight Internationalization Module
 * Provides translation functionality with localStorage persistence
 */

const i18n = {
  translations: {},
  currentLang: 'en',
  supportedLangs: ['en', 'zh'],

  /**
   * Initialize i18n system
   * @returns {Promise<void>}
   */
  async init() {
    // Load saved language preference
    const savedLang = localStorage.getItem('f2b-lang');
    this.currentLang = savedLang || 'en';

    // Validate saved language
    if (!this.supportedLangs.includes(this.currentLang)) {
      this.currentLang = 'en';
    }

    // Load translations
    await this.loadTranslations(this.currentLang);

    // Apply translations to DOM
    this.updateDOM();

    // Setup language toggle button
    this.setupLanguageToggle();
  },

  /**
   * Load translation file for given language
   * @param {string} lang - Language code (en, zh)
   * @returns {Promise<void>}
   */
  async loadTranslations(lang) {
    try {
      const response = await fetch(`i18n/${lang}.json?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang}.json`);
      }
      this.translations = await response.json();
    } catch (error) {
      console.error(`i18n: Error loading ${lang} translations:`, error);
      // Fallback to English if translation loading fails
      if (lang !== 'en') {
        await this.loadTranslations('en');
      }
    }
  },

  /**
   * Get translation for a nested key
   * @param {string} key - Dot-notation key (e.g., 'stats.totalAttacks')
   * @param {object} params - Optional interpolation parameters
   * @returns {string} Translated string or key if not found
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Key not found - fallback to English
        console.warn(`i18n: Key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Interpolate parameters
    let result = value;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue);
    }

    return result;
  },

  /**
   * Set the current language and update UI
   * @param {string} lang - Language code
   * @returns {Promise<void>}
   */
  async setLanguage(lang) {
    if (!this.supportedLangs.includes(lang)) {
      console.error(`i18n: Unsupported language: ${lang}`);
      return;
    }

    if (lang === this.currentLang) {
      return;
    }

    this.currentLang = lang;
    localStorage.setItem('f2b-lang', lang);

    await this.loadTranslations(lang);
    this.updateDOM();
    this.updateToggleButton();
  },

  /**
   * Toggle between supported languages
   */
  toggleLanguage() {
    const currentIndex = this.supportedLangs.indexOf(this.currentLang);
    const nextIndex = (currentIndex + 1) % this.supportedLangs.length;
    this.setLanguage(this.supportedLangs[nextIndex]);
  },

  /**
   * Update all DOM elements with data-i18n attribute
   */
  updateDOM() {
    // Update text content
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      if (translation !== key) {
        element.textContent = translation;
      }
    });

    // Update title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const translation = this.t(key);
      if (translation !== key) {
        element.title = translation;
      }
    });

    // Update placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      if (translation !== key) {
        element.placeholder = translation;
      }
    });

    // Dispatch event for components that need to react to language change
    document.dispatchEvent(new CustomEvent('i18n:languageChanged', {
      detail: { lang: this.currentLang }
    }));
  },

  /**
   * Setup language toggle button functionality
   */
  setupLanguageToggle() {
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleLanguage());
      this.updateToggleButton();
    }
  },

  /**
   * Update language toggle button appearance
   */
  updateToggleButton() {
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
      // Update button text or icon based on current language
      const nextLang = this.currentLang === 'en' ? 'zh' : 'en';
      toggleBtn.dataset.nextLang = nextLang;
      toggleBtn.title = this.t(`language.${nextLang === 'en' ? 'english' : 'chinese'}`);
    }
  },

  /**
   * Get current language
   * @returns {string} Current language code
   */
  getCurrentLang() {
    return this.currentLang;
  }
};

// Export functions for global use
const initI18n = () => i18n.init();
const setLanguage = (lang) => i18n.setLanguage(lang);
const t = (key, params) => i18n.t(key, params);
const toggleLanguage = () => i18n.toggleLanguage();
const getCurrentLang = () => i18n.getCurrentLang();

// Make available globally
window.i18n = i18n;
window.initI18n = initI18n;
window.setLanguage = setLanguage;
window.t = t;
window.toggleLanguage = toggleLanguage;
window.getCurrentLang = getCurrentLang;
