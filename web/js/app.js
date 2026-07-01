/**
 * app.js — Fail2Ban Dashboard Main Application
 * Initializes the dashboard, fetches data, and renders components.
 */

(function () {
  'use strict';

  // --- LocalStorage keys ---
  const LS_THEME = 'f2b-theme';
  const LS_STATS_PREV = 'f2b-stats-prev';
  var LS_TIME_RANGE = 'f2b-time-range';

  // --- Stats card field mapping ---
  const STATS_CARDS = [
    { id: 'stat-total-attacks', key: 'totalAttacks', i18n: 'stats.totalAttacks' },
    { id: 'stat-active-bans', key: 'activeBans', i18n: 'stats.activeBans' },
    { id: 'stat-unique-ips', key: 'uniqueIPs', i18n: 'stats.uniqueIPs' },
    { id: 'stat-active-jails', key: 'activeJails', i18n: 'stats.activeJails' },
  ];

  // --- State ---
  let refreshTimer = null;
  let lastUpdateTimer = null;
  let currentData = null;
  var _selectedJail = null;
  var currentTimeRange = localStorage.getItem(LS_TIME_RANGE) || 'all';
  var lastFetchedAt = null;
  var lastDataTimestamp = null;

  // --- Time Range Change Handler ---

  function onTimeRangeChanged() {
    var select = document.getElementById('time-range');
    if (select) {
      currentTimeRange = select.value;
    }
    localStorage.setItem(LS_TIME_RANGE, currentTimeRange);
    if (currentData) {
      if (currentData.timeline && currentData.timeline.length) {
        renderTimelineChart('chart-timeline', currentData.timeline, currentTimeRange);
      }
      if (currentData.trends && currentData.trends.length) {
        renderTrendChart('chart-trend', currentData.trends, currentTimeRange);
      }
    }
  }

  // ============================================================
  // Stats Cards
  // ============================================================

  /**
   * Render the 4 stats cards from dashboard summary data.
   * @param {object} data - Full dashboard JSON object
   */
  function renderStatsCards(data) {
    if (!data || !data.summary) return;

    const summary = data.summary;
    const prevRaw = localStorage.getItem(LS_STATS_PREV);
    var prev = null;
    if (prevRaw) {
      try { prev = JSON.parse(prevRaw); } catch (e) { prev = null; }
    }

    STATS_CARDS.forEach(function (card) {
      const valueEl = document.getElementById(card.id);
      const trendEl = document.getElementById(card.id + '-trend');
      if (!valueEl) return;

      const currentVal = summary[card.key];
      if (currentVal == null || isNaN(currentVal)) {
        valueEl.textContent = '--';
        if (trendEl) trendEl.textContent = '';
        return;
      }

      valueEl.textContent = Number(currentVal).toLocaleString();

      // Trend indicator: compare with previous data
      if (trendEl && prev && prev[card.key] != null) {
        const diff = currentVal - prev[card.key];
        if (diff > 0) {
          trendEl.textContent = '\u25B2 ' + Math.abs(diff).toLocaleString();
          trendEl.className = 'stat-card__trend stat-card__trend--up';
        } else if (diff < 0) {
          trendEl.textContent = '\u25BC ' + Math.abs(diff).toLocaleString();
          trendEl.className = 'stat-card__trend stat-card__trend--down';
        } else {
          trendEl.textContent = '';
          trendEl.className = 'stat-card__trend';
        }
      } else if (trendEl) {
        trendEl.textContent = '';
        trendEl.className = 'stat-card__trend';
      }
    });

    // Save current summary for next comparison
    const snapshot = {};
    STATS_CARDS.forEach(function (card) {
      snapshot[card.key] = summary[card.key];
    });
    localStorage.setItem(LS_STATS_PREV, JSON.stringify(snapshot));
  }

  /**
   * Render the Fail2Ban service status card.
   * @param {object} data - Full dashboard JSON object
   */
  function renderF2BStatusCard(data) {
    var el = document.getElementById('stat-f2b-status');
    if (!el) return;

    var card = document.getElementById('stat-f2b-status-card');
    var status = data && data.summary && data.summary.f2bStatus;
    if (!status) {
      el.textContent = '--';
      if (card) card.classList.remove('stat-card--running', 'stat-card--stopped');
      return;
    }

    var key = 'stats.f2bStatus.' + status;
    var translated = t(key);
    el.textContent = translated !== key ? translated : status;

    if (card) {
      card.classList.remove('stat-card--running', 'stat-card--stopped');
      if (status === 'running') {
        card.classList.add('stat-card--running');
      } else if (status === 'stopped') {
        card.classList.add('stat-card--stopped');
      }
    }
  }

  // ============================================================
  // Per-Jail Report
  // ============================================================

  /**
   * Render the per-jail detailed report with jail toggle.
   * @param {object} data - Full dashboard JSON object
   */
  function renderPerJailReport(data) {
    var container = document.getElementById('jail-report-grid');
    if (!container) return;

    if (!data || !data.perJail) {
      container.innerHTML = '<div class="empty-state">' + t('errors.noData') + '</div>';
      return;
    }

    var jails = Object.keys(data.perJail);
    if (!jails.length) {
      container.innerHTML = '<div class="empty-state">' + t('errors.noData') + '</div>';
      return;
    }

    if (!_selectedJail || !data.perJail[_selectedJail]) {
      _selectedJail = jails[0];
    }

    renderPerJailContent(_selectedJail, data);
  }

  /**
   * Render per-jail content for the selected jail.
   * @param {string} jail - Jail name (e.g. 'sshd', 'asterisk')
   * @param {object} data - Full dashboard JSON object
   */
  function renderPerJailContent(jail, data) {
    var container = document.getElementById('jail-report-grid');
    if (!container) return;

    var jails = Object.keys(data.perJail);
    var jailData = data.perJail[jail];
    var jailLabel = jail === 'sshd' ? t('charts.sshd') : (jail === 'asterisk' ? t('charts.asterisk') : jail);
    var jailColorClass = 'jail-report-card__title--' + jail;

    var toggleHTML = '<div class="jail-toggle" id="jail-toggle">';
    for (var i = 0; i < jails.length; i++) {
      var j = jails[i];
      var label = j === 'sshd' ? t('charts.sshd') : (j === 'asterisk' ? t('charts.asterisk') : j);
      var activeClass = j === jail ? ' jail-toggle__btn--active' : '';
      toggleHTML += '<button type="button" class="jail-toggle__btn' + activeClass + '" data-jail="' + escapeHtml(j) + '">' + escapeHtml(label) + '</button>';
    }
    toggleHTML += '</div>';

    var configHTML = '<div class="jail-report-card">' +
      '<div class="jail-report-card__title ' + jailColorClass + '">' + escapeHtml(jailLabel) + ' ' + t('perJail.configCard') + '</div>' +
      '<div class="jail-report-card__stats">' +
        '<div class="jail-stat">' +
          '<span class="jail-stat__value">' + formatDuration(jailData.banTime) + '</span>' +
          '<span class="jail-stat__label">' + t('jailConfig.banTime') + '</span>' +
        '</div>' +
        '<div class="jail-stat">' +
          '<span class="jail-stat__value">' + formatDuration(jailData.findtime) + '</span>' +
          '<span class="jail-stat__label">' + t('jailConfig.findTime') + '</span>' +
        '</div>' +
        '<div class="jail-stat">' +
          '<span class="jail-stat__value">' + jailData.maxRetry + '</span>' +
          '<span class="jail-stat__label">' + t('jailConfig.maxRetry') + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';

    var statsHTML = '<div class="jail-report-card">' +
      '<div class="jail-report-card__stats">' +
        '<div class="jail-stat">' +
          '<span class="jail-stat__value">' + Number(jailData.totalBans).toLocaleString() + ' / ' + Number(jailData.totalUnbans).toLocaleString() + '</span>' +
          '<span class="jail-stat__label">' + t('perJail.banRatio') + '</span>' +
        '</div>' +
        '<div class="jail-stat">' +
          '<span class="jail-stat__value">' + Number(jailData.totalAttacks).toLocaleString() + '</span>' +
          '<span class="jail-stat__label">' + t('perJail.uniqueAttackers') + '</span>' +
        '</div>' +
        '<div class="jail-stat">' +
          '<span class="jail-stat__value">' + Number(jailData.currentBanned).toLocaleString() + '</span>' +
          '<span class="jail-stat__label">' + t('stats.activeBans') + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';

    var topIPs = jailData.topIPs || [];
    var ipsHTML = '<div class="jail-report-card">' +
      '<div class="jail-report-card__title ' + jailColorClass + '">' + t('perJail.topIPs') + '</div>';

    if (topIPs.length) {
      ipsHTML += '<div class="ip-table-wrapper"><table class="ip-table">' +
        '<thead><tr>' +
          '<th>#</th>' +
          '<th>' + t('topIPs.ip') + '</th>' +
          '<th>' + t('topIPs.country') + '</th>' +
          '<th>' + t('topIPs.attacks') + '</th>' +
        '</tr></thead><tbody>';

      var maxIPs = Math.min(topIPs.length, 10);
      for (var k = 0; k < maxIPs; k++) {
        var ip = topIPs[k];
        var flag = getCountryFlag(ip.country);
        var countryDisplay = flag ? flag + ' ' + (ip.country || '--') : (ip.country || '--');
        ipsHTML += '<tr>' +
          '<td class="ip-table__rank">' + (k + 1) + '</td>' +
          '<td class="ip-table__ip">' + escapeHtml(ip.ip || '--') + '</td>' +
          '<td class="ip-table__country">' + escapeHtml(countryDisplay) + '</td>' +
          '<td class="ip-table__count">' + Number(ip.count || 0).toLocaleString() + '</td>' +
        '</tr>';
      }

      ipsHTML += '</tbody></table></div>';
    } else {
      ipsHTML += '<div class="empty-state">' + t('topIPs.noData') + '</div>';
    }
    ipsHTML += '</div>';

    var chartHTML = '<div class="jail-report-card">' +
      '<div class="jail-report-card__title ' + jailColorClass + '">' + t('perJail.timeline') + '</div>' +
      '<div id="jail-attack-trend-chart" class="chart-container chart-container--mini"></div>' +
    '</div>';

    if (typeof disposeChartInstance === 'function') {
      disposeChartInstance('jail-attack-trend-chart');
    }

    container.innerHTML = toggleHTML + configHTML + statsHTML + ipsHTML + chartHTML;

    renderPerJailMiniChart(jail, data);

    var toggleBtns = container.querySelectorAll('.jail-toggle__btn');
    for (var b = 0; b < toggleBtns.length; b++) {
      toggleBtns[b].addEventListener('click', function () {
        var jailName = this.getAttribute('data-jail');
        if (jailName && jailName !== _selectedJail) {
          _selectedJail = jailName;
          renderPerJailContent(jailName, data);
        }
      });
    }
  }

  // ============================================================
  // Log List
  // ============================================================

  var LOG_EVENT_COLORS = {
    Found: 'found',
    Ban: 'ban',
    Unban: 'unban',
    RestoreBan: 'restoreban',
    AlreadyBanned: 'alreadybanned',
    Ignore: 'ignore'
  };

  var LOG_EVENT_I18N_KEYS = {
    Found: 'eventTypes.found',
    Ban: 'eventTypes.ban',
    Unban: 'eventTypes.unban',
    RestoreBan: 'eventTypes.restoreBan',
    AlreadyBanned: 'eventTypes.alreadyBanned',
    Ignore: 'eventTypes.ignore'
  };

  function formatLogTimestamp(isoStr) {
    var d = new Date(isoStr);
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var hours = String(d.getHours()).padStart(2, '0');
    var mins = String(d.getMinutes()).padStart(2, '0');
    var secs = String(d.getSeconds()).padStart(2, '0');
    return month + '-' + day + ' ' + hours + ':' + mins + ':' + secs;
  }

  function renderLogList(data) {
    var container = document.getElementById('log-list');
    if (!container) return;

    var logs = (data && data.recentLogs) || [];
    if (!logs.length) {
      container.innerHTML = '<div class="empty-state">' + t('errors.noData') + '</div>';
      return;
    }

    var currentFilter = container.dataset.filter || '';

    container.innerHTML = '';

    var filterBar = document.createElement('div');
    filterBar.className = 'log-list__filter-bar';

    var filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.className = 'log-list__filter-input';
    filterInput.placeholder = t('logList.filter');
    filterInput.value = currentFilter;
    filterInput.setAttribute('data-i18n-placeholder', 'logList.filter');
    filterInput.setAttribute('aria-label', t('logList.filter'));

    var counter = document.createElement('span');
    counter.className = 'log-list__counter';

    filterBar.appendChild(filterInput);
    filterBar.appendChild(counter);
    container.appendChild(filterBar);

    var listEl = document.createElement('div');
    listEl.className = 'log-list__entries';
    container.appendChild(listEl);

    function renderEntries() {
      var filterText = filterInput.value.toLowerCase().trim();
      container.dataset.filter = filterText;

      var filtered = logs;
      if (filterText) {
        filtered = logs.filter(function (entry) {
          return (
            (entry.timestamp && entry.timestamp.toLowerCase().indexOf(filterText) !== -1) ||
            (entry.type && entry.type.toLowerCase().indexOf(filterText) !== -1) ||
            (entry.jail && entry.jail.toLowerCase().indexOf(filterText) !== -1) ||
            (entry.ip && entry.ip.toLowerCase().indexOf(filterText) !== -1) ||
            (entry.message && entry.message.toLowerCase().indexOf(filterText) !== -1)
          );
        });
      }

      counter.textContent = t('logList.showing') + ' ' + filtered.length + ' ' + t('logList.of') + ' ' + logs.length + ' ' + t('logList.entries');

      listEl.innerHTML = '';

      if (!filtered.length) {
        var emptyEl = document.createElement('div');
        emptyEl.className = 'empty-state';
        emptyEl.textContent = t('errors.noData');
        listEl.appendChild(emptyEl);
        return;
      }

      filtered.forEach(function (entry) {
        var row = document.createElement('div');
        row.className = 'log-entry';

        var timeEl = document.createElement('span');
        timeEl.className = 'log-entry__time';
        timeEl.textContent = formatLogTimestamp(entry.timestamp);

        var badgeClass = LOG_EVENT_COLORS[entry.type] || 'found';
        var badgeLabel = t(LOG_EVENT_I18N_KEYS[entry.type] || 'eventTypes.found');

        var badgeEl = document.createElement('span');
        badgeEl.className = 'log-event-badge log-event-badge--' + badgeClass;
        badgeEl.textContent = badgeLabel;

        var actionEl = document.createElement('span');
        actionEl.className = 'log-entry__action';
        actionEl.appendChild(badgeEl);

        var jailEl = document.createElement('span');
        jailEl.className = 'log-entry__jail log-entry__jail--' + (entry.jail || 'sshd');
        jailEl.textContent = entry.jail || '--';

        var ipEl = document.createElement('span');
        ipEl.className = 'log-entry__ip';
        ipEl.textContent = entry.ip || '--';

        var msgEl = document.createElement('span');
        msgEl.className = 'log-entry__message';
        msgEl.textContent = entry.message || '';
        msgEl.title = entry.message || '';

        row.appendChild(timeEl);
        row.appendChild(actionEl);
        row.appendChild(jailEl);
        row.appendChild(ipEl);
        row.appendChild(msgEl);
        listEl.appendChild(row);
      });
    }

    filterInput.addEventListener('input', renderEntries);
    renderEntries();
  }

  // ============================================================
  // Data Fetching
  // ============================================================

  /**
   * Fetch dashboard data and render all components.
   * @returns {Promise<object|null>}
   */
  async function fetchAndRender() {
    try {
      const url = CONFIG.dataPath + 'dashboard.json?t=' + Date.now();
      var response;
      try {
        response = await fetch(url);
      } catch (networkErr) {
        window.showErrorBanner(t('errors.dataUnavailable') + ' — Network error');
        console.error('Dashboard: Network error —', networkErr);
        return null;
      }

      if (!response.ok) {
        var msg = 'HTTP ' + response.status;
        if (response.status === 404) msg = t('errors.dataUnavailable') + ' — File not found (404)';
        else if (response.status >= 500) msg = t('errors.dataUnavailable') + ' — Server error (' + response.status + ')';
        window.showErrorBanner(msg);
        console.error('Dashboard: Fetch failed —', msg);
        return null;
      }

      var data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        window.showErrorBanner(t('errors.dataUnavailable') + ' — Invalid JSON');
        console.error('Dashboard: JSON parse error —', jsonErr);
        return null;
      }

      if (!window.isValidDashboardData(data)) {
        window.showErrorBanner(t('errors.dataUnavailable') + ' — Invalid dashboard data');
        console.error('Dashboard: Validation failed — data missing summary or totalAttacks');
        return null;
      }

      currentData = data;
      window.hideErrorBanner();
      lastFetchedAt = new Date();
      lastDataTimestamp = data.meta && (data.meta.lastUpdated || data.meta.generatedAt);

      renderStatsCards(data);
      renderF2BStatusCard(data);
      updateLastUpdated(lastDataTimestamp);

      if (data.timeline && data.timeline.length) {
        // Auto-switch to 'all' if current time range filters out everything
        if (currentTimeRange !== 'all') {
          var now = new Date();
          var cutoff = currentTimeRange === '24h'
            ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
            : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          var lastTimestamp = new Date(data.timeline[data.timeline.length - 1].timestamp);
          if (lastTimestamp < cutoff) {
            currentTimeRange = 'all';
            localStorage.setItem(LS_TIME_RANGE, 'all');
            var timeRangeSelect = document.getElementById('time-range');
            if (timeRangeSelect) timeRangeSelect.value = 'all';
          }
        }
        renderTimelineChart('chart-timeline', data.timeline, currentTimeRange);
      }

      if (data.trends && data.trends.length) {
        renderTrendChart('chart-trend', data.trends, currentTimeRange);
      }

      if (data.topIPs && data.topIPs.length) {
        renderTopIPsTable(data.topIPs);
        renderWorldMap('chart-world-map', data.topIPs);
      }

      if (data.heatmap && data.heatmap.grid && data.heatmap.grid.length) {
        renderHeatmap('chart-heatmap', data);
      }

      if (data.recentLogs && data.recentLogs.length) {
        renderLogList(data);
      }

      if (data.perJail && Object.keys(data.perJail).length) {
        renderPerJailReport(data);
      }

      if (data.jails && Object.keys(data.jails).length) {
        renderJailStats('chart-jail-stats', data);
      }

      return data;
    } catch (err) {
      console.error('Dashboard: Unexpected error —', err);
      window.showErrorBanner(t('errors.dataUnavailable'));
      return null;
    }
  }

  /**
   * Update the header timestamp display with data generated and fetched times.
   * @param {string} isoTimestamp - ISO timestamp from data.meta.generatedAt
   */
  function updateLastUpdated(isoTimestamp) {
    const el = document.getElementById('last-update-time');
    if (!el) return;

    if (!isoTimestamp) {
      el.textContent = t('time.dataGenerated') + ': --';
      return;
    }

    function relativeTime(date) {
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return t('time.justNow');
      if (diffMin < 60) return diffMin + ' ' + t('time.minutesAgo');
      const diffHr = Math.floor(diffMin / 60);
      return diffHr + ' ' + t('time.hoursAgo');
    }

    var parts = [];
    parts.push(t('time.dataGenerated') + ': ' + relativeTime(new Date(isoTimestamp)));
    if (lastFetchedAt) {
      parts.push(t('time.lastFetched') + ': ' + relativeTime(lastFetchedAt));
    }
    el.textContent = parts.join(' · ');
  }

  // ============================================================
  // Refresh Control
  // ============================================================

  /**
   * Start or restart the auto-refresh timer.
   */
  function setupRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (lastUpdateTimer) {
      clearInterval(lastUpdateTimer);
      lastUpdateTimer = null;
    }

    const select = document.getElementById('refresh-interval');
    if (!select) return;

    const interval = parseInt(select.value, 10);

    if (interval > 0) {
      refreshTimer = setInterval(fetchAndRender, interval);
      lastUpdateTimer = setInterval(function () {
        if (lastDataTimestamp) updateLastUpdated(lastDataTimestamp);
      }, 60000);
    }
  }

  // ============================================================
  // Theme Toggle
  // ============================================================

  /**
   * Initialize theme from localStorage or default to dark.
   */
  function initTheme() {
    const saved = localStorage.getItem(LS_THEME);
    const theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }

  /**
   * Toggle between dark and light themes.
   */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(LS_THEME, next);
    updateThemeIcon(next);
    refreshChartsOnThemeChange(currentData);
  }

  /**
   * Update the theme toggle button icon.
   * @param {string} theme
   */
  function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    // Sun for dark mode (click to go light), Moon for light mode (click to go dark)
    icon.textContent = theme === 'dark' ? '\u263E' : '\u2600';
  }

  // ============================================================
  // Language Change Handler
  // ============================================================

  /**
   * Re-render dynamic content when language changes.
   */
  function onLanguageChanged() {
    if (currentData) {
      renderStatsCards(currentData);
      renderF2BStatusCard(currentData);
      updateLastUpdated(currentData.meta && currentData.meta.generatedAt);
      if (currentData.timeline && currentData.timeline.length) {
        renderTimelineChart('chart-timeline', currentData.timeline, currentTimeRange);
      }
      if (currentData.trends && currentData.trends.length) {
        renderTrendChart('chart-trend', currentData.trends, currentTimeRange);
      }
      if (currentData.topIPs) {
        renderTopIPsTable(currentData.topIPs);
        renderWorldMap('chart-world-map', currentData.topIPs);
      }
      if (currentData.heatmap) {
        renderHeatmap('chart-heatmap', currentData);
      }
      if (currentData.recentLogs) {
        renderLogList(currentData);
      }
      if (currentData.perJail) {
        renderPerJailReport(currentData);
      }
      if (currentData.jails) {
        renderJailStats('chart-jail-stats', currentData);
      }
    }
  }

  // ============================================================
  // Initialization
  // ============================================================

  /**
   * Main initialization — called on DOMContentLoaded.
   */
  async function init() {
    // Theme
    initTheme();

    // Initialize i18n (loads saved language, applies translations)
    if (typeof initI18n === 'function') {
      await initI18n();
    }

    // Theme toggle button
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }

    // Time range selector
    var timeRangeSelect = document.getElementById('time-range');
    if (timeRangeSelect) {
      timeRangeSelect.value = currentTimeRange;
      timeRangeSelect.addEventListener('change', onTimeRangeChanged);
    }

    // Refresh interval selector — set up once, calls setupRefresh on change
    var refreshSelect = document.getElementById('refresh-interval');
    if (refreshSelect) {
      refreshSelect.addEventListener('change', function () {
        setupRefresh();
      });
    }

    // Listen for language changes to re-render dynamic content
    document.addEventListener('i18n:languageChanged', onLanguageChanged);

    // Initial data fetch
    await fetchAndRender();

    // Auto-refresh
    setupRefresh();
  }

  // --- Expose for global use ---
  window.renderStatsCards = renderStatsCards;
  window.renderPerJailReport = renderPerJailReport;
  window.fetchAndRender = fetchAndRender;

  // Expose _selectedJail for chart theme refresh
  Object.defineProperty(window, '_selectedJail', {
    get: function () { return _selectedJail; },
    set: function (v) { _selectedJail = v; }
  });

  // --- Boot ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();