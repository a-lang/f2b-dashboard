/**
 * utils.js — Fail2Ban Dashboard Shared Utilities
 * Common helper functions used across charts.js, app.js, and other modules.
 */

(function () {
  'use strict';

  // ============================================================
  // HTML Escaping
  // ============================================================

  /**
   * Escape HTML special characters to prevent XSS.
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  function escapeHtml(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  // ============================================================
  // Country Flag Emoji Mapping
  // ============================================================

  /**
   * Map country names to flag emoji using regional indicator symbols.
   * Only includes countries likely to appear in attack data.
   */
  var COUNTRY_FLAGS = {
    'United States': '\uD83C\uDDFA\uD83C\uDDF8',
    'China': '\uD83C\uDDE8\uD83C\uDDF3',
    'Russia': '\uD83C\uDDF7\uD83C\uDDFA',
    'Germany': '\uD83C\uDDE9\uD83C\uDDEA',
    'The Netherlands': '\uD83C\uDDF3\uD83C\uDDF1',
    'France': '\uD83C\uDDEB\uD83C\uDDF7',
    'South Korea': '\uD83C\uDDF0\uD83C\uDDF7',
    'India': '\uD83C\uDDEE\uD83C\uDDF3',
    'Brazil': '\uD83C\uDDE7\uD83C\uDDF7',
    'Vietnam': '\uD83C\uDDFB\uD83C\uDDF3',
    'Turkey': '\uD83C\uDDF9\uD83C\uDDF7',
    'Indonesia': '\uD83C\uDDEE\uD83C\uDDE9',
    'Thailand': '\uD83C\uDDF9\uD83C\uDDED',
    'Ukraine': '\uD83C\uDDFA\uD83C\uDDE6',
    'Japan': '\uD83C\uDDEF\uD83C\uDDF5',
    'United Kingdom': '\uD83C\uDDEC\uD83C\uDDE7',
    'Canada': '\uD83C\uDDE8\uD83C\uDDE6',
    'Australia': '\uD83C\uDDE6\uD83C\uDDFA',
    'Italy': '\uD83C\uDDEE\uD83C\uDDF9',
    'Spain': '\uD83C\uDDEA\uD83C\uDDF8',
    'Poland': '\uD83C\uDDF5\uD83C\uDDF1',
    'Netherlands': '\uD83C\uDDF3\uD83C\uDDF1',
    'Singapore': '\uD83C\uDDF8\uD83C\uDDEC',
    'Hong Kong': '\uD83C\uDDED\uD83C\uDDF0',
    'Taiwan': '\uD83C\uDDF9\uD83C\uDDFC',
    'Israel': '\uD83C\uDDEE\uD83C\uDDF1',
    'Belarus': '\uD83C\uDDE7\uD83C\uDDFE',
    'Latvia': '\uD83C\uDDF1\uD83C\uDDFB',
    'Lithuania': '\uD83C\uDDF1\uD83C\uDDF9',
    'Peru': '\uD83C\uDDF5\uD83C\uDDEA',
    'Andorra': '\uD83C\uDDE6\uD83C\uDDE9',
    'Argentina': '\uD83C\uDDE6\uD83C\uDDF7',
    'Mexico': '\uD83C\uDDF2\uD83C\uDDFD',
    'Philippines': '\uD83C\uDDF5\uD83C\uDDED',
    'Malaysia': '\uD83C\uDDF2\uD83C\uDDFE',
    'Iran': '\uD83C\uDDEE\uD83C\uDDF7',
    'Pakistan': '\uD83C\uDDF5\uD83C\uDDF0',
    'Bangladesh': '\uD83C\uDDE7\uD83C\uDDE9',
    'Nigeria': '\uD83C\uDDF3\uD83C\uDDEC',
    'South Africa': '\uD83C\uDDFF\uD83C\uDDE6',
    'Egypt': '\uD83C\uDDEA\uD83C\uDDEC',
    'Morocco': '\uD83C\uDDF2\uD83C\uDDE6',
    'Colombia': '\uD83C\uDDE8\uD83C\uDDF4',
    'Chile': '\uD83C\uDDE8\uD83C\uDDF1',
    'Romania': '\uD83C\uDDF7\uD83C\uDDF4',
    'Czech Republic': '\uD83C\uDDE8\uD83C\uDDFF',
    'Hungary': '\uD83C\uDDED\uD83C\uDDFA',
    'Bulgaria': '\uD83C\uDDE7\uD83C\uDDEC',
    'Sweden': '\uD83C\uDDF8\uD83C\uDDEA',
    'Finland': '\uD83C\uDDEB\uD83C\uDDEE',
    'Norway': '\uD83C\uDDF3\uD83C\uDDF4',
    'Denmark': '\uD83C\uDDE9\uD83C\uDDF0',
    'Austria': '\uD83C\uDDE6\uD83C\uDDF9',
    'Switzerland': '\uD83C\uDDE8\uD83C\uDDED',
    'Belgium': '\uD83C\uDDE7\uD83C\uDDEA',
    'Portugal': '\uD83C\uDDF5\uD83C\uDDF9',
    'Ireland': '\uD83C\uDDEE\uD83C\uDDEA',
    'Greece': '\uD83C\uDDEC\uD83C\uDDF7',
    'New Zealand': '\uD83C\uDDF3\uD83C\uDDFF'
  };

  /**
   * Get flag emoji for a country name.
   * @param {string} country - Country name
   * @returns {string} Flag emoji or empty string
   */
  function getCountryFlag(country) {
    if (!country) return '';
    return COUNTRY_FLAGS[country] || '';
  }

  // ============================================================
  // Number Formatting
  // ============================================================

  /**
   * Format a number with locale-specific separators.
   * @param {number} num - Number to format
   * @returns {string} Formatted number or '--'
   */
  function formatNumber(num) {
    if (num == null || isNaN(num)) return '--';
    return Number(num).toLocaleString();
  }

  // ============================================================
  // Debounce
  // ============================================================

  /**
   * Debounce a function call.
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  // ============================================================
  // Theme Detection
  // ============================================================

  /**
   * Check if dark theme is active.
   * @returns {boolean}
   */
  function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  // ============================================================
  // Color Conversion
  // ============================================================

  /**
   * Convert hex color to rgba string.
   * @param {string} hex - Hex color (e.g., '#f87171')
   * @param {number} alpha - Alpha value (0-1)
   * @returns {string} rgba color string
   */
  function hexToRgba(hex, alpha) {
    if (!hex || hex.charAt(0) !== '#') return 'rgba(128,128,128,' + alpha + ')';
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ============================================================
  // Error Banner
  // ============================================================

  /**
   * Show the error banner with a message.
   * Creates the banner element if it does not exist.
   * @param {string} message - Error message to display
   */
  function showErrorBanner(message) {
    var banner = document.getElementById('error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'error-banner';
      banner.className = 'error-banner';
      var container = document.querySelector('.dashboard-container');
      if (container) {
        container.insertBefore(banner, container.firstChild);
      } else {
        document.body.insertBefore(banner, document.body.firstChild);
      }
    }
    banner.textContent = message || t('errors.dataUnavailable');
    banner.classList.remove('hidden');
  }

  /**
   * Hide the error banner.
   */
  function hideErrorBanner() {
    var banner = document.getElementById('error-banner');
    if (banner) {
      banner.classList.add('hidden');
    }
  }

  // ============================================================
  // Duration Formatting
  // ============================================================

  /**
   * Format seconds into a human-readable duration string (i18n-aware).
   * @param {number} seconds - Duration in seconds (e.g. 7200, 259200)
   * @returns {string} Formatted duration (e.g. "2 hours", "3 days 4 hours")
   */
  function formatDuration(seconds) {
    if (seconds == null || isNaN(seconds) || seconds <= 0) return '--';

    var days = Math.floor(seconds / 86400);
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor(seconds / 60);

    if (days >= 1) {
      var remainHours = Math.floor((seconds % 86400) / 3600);
      if (remainHours > 0) {
        return days + ' ' + (days === 1 ? t('time.day') : t('time.days')) +
          ' ' + remainHours + ' ' + (remainHours === 1 ? t('time.hour') : t('time.hours'));
      }
      return days + ' ' + (days === 1 ? t('time.day') : t('time.days'));
    }
    if (hours >= 1) {
      return hours + ' ' + (hours === 1 ? t('time.hour') : t('time.hours'));
    }
    if (minutes >= 1) {
      return minutes + ' ' + (minutes === 1 ? t('time.minute') : t('time.minutes'));
    }
    return seconds + ' ' + (seconds === 1 ? t('time.second') : t('time.seconds'));
  }

  // ============================================================
  // Dashboard Data Validation
  // ============================================================

  /**
   * Validate that dashboard data has the expected structure.
   * @param {*} data - Data to validate
   * @returns {boolean}
   */
  function isValidDashboardData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.summary || typeof data.summary !== 'object') return false;
    if (typeof data.summary.totalAttacks !== 'number') return false;
    return true;
  }

  // ============================================================
  // Public API
  // ============================================================

  window.escapeHtml = escapeHtml;
  window.getCountryFlag = getCountryFlag;
  window.formatNumber = formatNumber;
  window.formatDuration = formatDuration;
  window.debounce = debounce;
  window.isDarkTheme = isDarkTheme;
  window.hexToRgba = hexToRgba;
  window.showErrorBanner = showErrorBanner;
  window.hideErrorBanner = hideErrorBanner;
  window.isValidDashboardData = isValidDashboardData;
})();
