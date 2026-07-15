/**
 * Landing page i18n module
 * Lightweight internationalization with localStorage persistence
 */

const landingI18n = {
  translations: {},
  currentLang: 'en',
  supportedLangs: ['en', 'zh'],
  storageKey: 'f2b-landing-lang',

  async init() {
    const savedLang = localStorage.getItem(this.storageKey);
    this.currentLang = this.supportedLangs.includes(savedLang) ? savedLang : 'en';
    await this.loadTranslations(this.currentLang);
    this.updateDOM();
    this.updateToggleButton();
  },

  async loadTranslations(lang) {
    try {
      const response = await fetch(`i18n/${lang}.json?t=${Date.now()}`);
      if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
      this.translations = await response.json();
    } catch (error) {
      console.error(`Landing i18n: Error loading ${lang}:`, error);
      if (lang !== 'en') await this.loadTranslations('en');
    }
  },

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Landing i18n: Key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') return key;

    let result = value;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(new RegExp(`{${paramKey}}`, 'g'), paramValue);
    }
    return result;
  },

  async setLanguage(lang) {
    if (!this.supportedLangs.includes(lang) || lang === this.currentLang) return;
    this.currentLang = lang;
    localStorage.setItem(this.storageKey, lang);
    await this.loadTranslations(lang);
    this.updateDOM();
    this.updateToggleButton();
    document.documentElement.lang = lang;
    document.dispatchEvent(new CustomEvent('landing:i18nChanged', { detail: { lang } }));
  },

  toggleLanguage() {
    const currentIndex = this.supportedLangs.indexOf(this.currentLang);
    const nextIndex = (currentIndex + 1) % this.supportedLangs.length;
    this.setLanguage(this.supportedLangs[nextIndex]);
  },

  updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      if (translation !== key) {
        element.textContent = translation;
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const translation = this.t(key);
      if (translation !== key) element.title = translation;
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
      const key = element.getAttribute('data-i18n-aria-label');
      const translation = this.t(key);
      if (translation !== key) element.setAttribute('aria-label', translation);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      if (translation !== key) element.placeholder = translation;
    });
  },

  updateToggleButton() {
    const btn = document.getElementById('lang-toggle');
    if (!btn) return;
    const nextLang = this.currentLang === 'en' ? 'zh' : 'en';
    btn.dataset.nextLang = nextLang;
    btn.title = this.currentLang === 'en' ? '切換至繁體中文' : 'Switch to English';
    btn.setAttribute('aria-label', btn.title);

    const langLabel = document.getElementById('lang-label');
    if (langLabel) {
      langLabel.textContent = this.currentLang === 'en' ? 'EN' : '中';
    }
  },

  getCurrentLang() {
    return this.currentLang;
  }
};

window.landingI18n = landingI18n;
window.t = (key, params) => landingI18n.t(key, params);
