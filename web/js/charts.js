/**
 * charts.js — Fail2Ban Dashboard Chart Rendering
 * ECharts-based visualizations: trend chart, and future chart modules.
 */

(function () {
  'use strict';

  // ============================================================
  // CSS Custom Property Helpers
  // ============================================================

  /**
   * Read a CSS custom property value from :root.
   * @param {string} prop - CSS variable name (e.g. '--chart-sshd')
   * @returns {string} Computed value
   */
  function getCSSVar(prop) {
    return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  }

  /**
   * Collect all chart-related colors from CSS custom properties.
   * Called at render time so theme changes are reflected.
   * @returns {object} Color map
   */
  function getChartColors() {
    return {
      sshd: getCSSVar('--chart-sshd'),
      asterisk: getCSSVar('--chart-asterisk'),
      total: getCSSVar('--chart-total'),
      grid: getCSSVar('--chart-grid'),
      text: getCSSVar('--chart-text'),
      bg: getCSSVar('--chart-bg'),
      cardBg: getCSSVar('--bg-card'),
      border: getCSSVar('--border'),
    };
  }

  /**
   * Build a tooltip style object from chart colors, theme-aware.
   * @param {object} colors - Color map from getChartColors()
   * @param {boolean} dark - Whether dark theme is active
   * @returns {{backgroundColor: string, borderColor: string, textStyle: {color: string, fontSize: number}}}
   */
  function getTooltipStyle(colors, dark) {
    return {
      backgroundColor: dark ? 'rgba(15,17,23,0.92)' : 'rgba(255,255,255,0.96)',
      borderColor: dark ? colors.grid : '#d4d7e0',
      borderWidth: 1,
      textStyle: { color: dark ? '#e8eaf0' : '#1a1c2b', fontSize: 13 }
    };
  }

  /**
   * Create a vertical linear gradient for ECharts area fill.
   * @param {string} hexColor - Hex color for the gradient
   * @returns {object} ECharts LinearGradient object
   */
  function areaGradient(hexColor) {
    if (typeof echarts === 'undefined' || !echarts.graphic) {
      return { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
        { offset: 0, color: window.hexToRgba(hexColor, 0.25) },
        { offset: 1, color: window.hexToRgba(hexColor, 0) }
      ] };
    }
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: window.hexToRgba(hexColor, 0.25) },
      { offset: 1, color: window.hexToRgba(hexColor, 0) }
    ]);
  }

  // ============================================================
  // Moving Average Calculation
  // ============================================================

  /**
   * Calculate simple 7-day moving average for an array of values.
   * @param {number[]} values - Array of numeric values
   * @param {number} window - Window size (default 7)
   * @returns {(number|null)[]} Array with nulls for positions without enough data
   */
  function movingAverage(values, window) {
    if (window === undefined) window = 7;
    var result = [];
    for (var i = 0; i < values.length; i++) {
      if (i < window - 1) {
        result.push(null);
      } else {
        var sum = 0;
        for (var j = 0; j < window; j++) {
          sum += values[i - j];
        }
        result.push(Math.round(sum / window));
      }
    }
    return result;
  }

  // ============================================================
  // Time Range Filtering
  // ============================================================

  /**
   * Filter data by time range, using the specified date field.
   * @param {Array} data - Data array
   * @param {string} timeRange - '24h', '7d', or 'all'
   * @param {string} dateField - Property name holding the date string ('date' or 'timestamp')
   * @returns {Array} Filtered data array
   */
  function filterByTimeRange(data, timeRange, dateField) {
    if (!data || !data.length) return [];

    if (timeRange === 'all') return data;

    var now = new Date();
    var cutoff;

    if (timeRange === '24h') {
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === '7d') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      return data;
    }

    return data.filter(function (item) {
      return new Date(item[dateField]) >= cutoff;
    });
  }

  // ============================================================
  // Chart Instance Registry
  // ============================================================

  /** Store ECharts instances for resize and theme updates */
  var chartInstances = {};

  /** Store last render params for timeline chart re-render on theme/i18n change */
  var _timelineRenderParams = null;

  /**
   * Get or create an ECharts instance on the given DOM element.
   * @param {string} id - DOM element ID
   * @returns {object|null} ECharts instance
   */
  function getChartInstance(id) {
    if (typeof echarts === 'undefined') return null;
    var dom = document.getElementById(id);
    if (!dom) return null;

    if (chartInstances[id]) {
      return chartInstances[id];
    }

    var instance = echarts.init(dom);
    chartInstances[id] = instance;
    return instance;
  }

  // ============================================================
  // Trend Chart
  // ============================================================

  /**
   * Render the attack trend stacked bar chart with 7-day moving average.
   * @param {string} containerId - DOM element ID for the chart container
   * @param {Array} data - Trends data array [{date, sshd, asterisk, total, ...}]
   * @param {string} timeRange - Time range filter: '24h', '7d', or 'all'
   */
  function renderTrendChart(containerId, data, timeRange) {
    if (!timeRange) timeRange = 'all';

    var chart = getChartInstance(containerId);
    if (!chart) return;

    var filtered = filterByTimeRange(data, timeRange, 'date');
    if (!filtered.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: t('errors.noData'),
          left: 'center',
          top: 'center',
          textStyle: { color: getCSSVar('--text-muted'), fontSize: 14 }
        }
      });
      return;
    }

    var colors = getChartColors();

    var dates = filtered.map(function (d) { return d.date; });
    var sshdData = filtered.map(function (d) { return d.sshd; });
    var asteriskData = filtered.map(function (d) { return d.asterisk; });
    var totalData = filtered.map(function (d) { return d.total; });
    var maData = movingAverage(totalData, 7);

    var option = {
      backgroundColor: colors.bg,

      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: { color: 'rgba(255,255,255,0.05)' }
        },
        backgroundColor: colors.cardBg,
        borderColor: colors.border,
        textStyle: { color: colors.text, fontSize: 12 },
        formatter: function (params) {
          if (!params || !params.length) return '';

          var dateStr = params[0].axisValue;
          var html = '<div style="font-weight:600;margin-bottom:4px">' + dateStr + '</div>';

          var sshdVal = 0;
          var asteriskVal = 0;
          var maVal = null;

          for (var i = 0; i < params.length; i++) {
            var p = params[i];
            if (p.seriesName === t('charts.sshd')) {
              sshdVal = p.value;
            } else if (p.seriesName === t('charts.asterisk')) {
              asteriskVal = p.value;
            } else if (p.seriesName === t('charts.movingAverage')) {
              maVal = p.value;
            }
          }

          html += '<div style="display:flex;align-items:center;gap:6px;margin:2px 0">'
            + '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'
            + colors.sshd + '"></span>'
            + t('charts.sshd') + ': <b>' + sshdVal.toLocaleString() + '</b></div>';

          html += '<div style="display:flex;align-items:center;gap:6px;margin:2px 0">'
            + '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'
            + colors.asterisk + '"></span>'
            + t('charts.asterisk') + ': <b>' + asteriskVal.toLocaleString() + '</b></div>';

          html += '<div style="display:flex;align-items:center;gap:6px;margin:2px 0;font-weight:600">'
            + t('table.total') + ': <b>' + (sshdVal + asteriskVal).toLocaleString() + '</b></div>';

          if (maVal !== null && maVal !== undefined) {
            html += '<div style="display:flex;align-items:center;gap:6px;margin:2px 0;border-top:1px solid '
              + colors.border + ';padding-top:4px;margin-top:4px">'
              + '<span style="display:inline-block;width:10px;height:2px;background:'
              + colors.total + '"></span>'
              + t('charts.movingAverage') + ': <b>' + maVal.toLocaleString() + '</b></div>';
          }

          return html;
        }
      },

      legend: {
        data: [t('charts.sshd'), t('charts.asterisk'), t('charts.movingAverage')],
        top: 0,
        left: 'center',
        textStyle: { color: colors.text, fontSize: 12 },
        itemWidth: 14,
        itemHeight: 10,
        itemGap: 16
      },

      grid: {
        left: 50,
        right: 20,
        top: 40,
        bottom: 30,
        containLabel: false
      },

      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: colors.grid } },
        axisTick: { lineStyle: { color: colors.grid } },
        axisLabel: {
          color: colors.text,
          fontSize: 11,
          rotate: dates.length > 14 ? 45 : 0,
          formatter: function (val) {
            // Show MM-DD format when many dates
            if (dates.length > 14) {
              var parts = val.split('-');
              return parts.length >= 3 ? parts[1] + '-' + parts[2] : val;
            }
            return val;
          }
        },
        splitLine: { show: false }
      },

      yAxis: {
        type: 'value',
        name: t('charts.count'),
        nameTextStyle: { color: colors.text, fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: colors.text,
          fontSize: 11,
          formatter: function (val) {
            if (val >= 1000) return (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'k';
            return val;
          }
        },
        splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } }
      },

      animation: false,

      series: [
        {
          name: t('charts.sshd'),
          type: 'bar',
          stack: 'attacks',
          data: sshdData,
          itemStyle: {
            color: colors.sshd,
            borderRadius: [0, 0, 0, 0]
          },
          barMaxWidth: 28,
          emphasis: {
            itemStyle: { opacity: 0.85 }
          }
        },
        {
          name: t('charts.asterisk'),
          type: 'bar',
          stack: 'attacks',
          data: asteriskData,
          itemStyle: {
            color: colors.asterisk,
            borderRadius: [2, 2, 0, 0]
          },
          barMaxWidth: 28,
          emphasis: {
            itemStyle: { opacity: 0.85 }
          }
        },
        {
          name: t('charts.movingAverage'),
          type: 'line',
          data: maData,
          smooth: 0.3,
          symbol: 'none',
          lineStyle: {
            color: colors.total,
            width: 2,
            type: 'solid'
          },
          z: 10
        }
      ]
    };

    chart.setOption(option, true);
  }

  // ============================================================
  // Timeline Chart
  // ============================================================

  /**
   * Render the attack timeline area chart.
   * @param {string} containerId - DOM element ID (e.g., 'chart-timeline')
   * @param {Array} data - Timeline data [{timestamp, sshd, asterisk, total}, ...]
   * @param {string} timeRange - '24h', '7d', or 'all'
   */
  function renderTimelineChart(containerId, data, timeRange) {
    if (!timeRange) timeRange = 'all';

    // Store params for re-render on theme/i18n change
    _timelineRenderParams = { containerId: containerId, data: data, timeRange: timeRange };

    var chart = getChartInstance(containerId);
    if (!chart) return;

    var filtered = filterByTimeRange(data, timeRange, 'timestamp');
    if (!filtered.length) {
      chart.clear();
      var emptyMsg = timeRange !== 'all' 
        ? t('errors.noData') + '\n' + t('timeRange.switchToAll')
        : t('errors.noData');
      chart.setOption({
        title: {
          text: emptyMsg,
          left: 'center',
          top: 'center',
          textStyle: { color: getCSSVar('--text-muted'), fontSize: 13 }
        }
      });
      return;
    }

    var colors = getChartColors();
    var dark = isDarkTheme();
    var lang = getCurrentLang();

    var sshdData = filtered.map(function (d) { return [d.timestamp, d.sshd]; });
    var asteriskData = filtered.map(function (d) { return [d.timestamp, d.asterisk]; });
    var totalData = filtered.map(function (d) { return [d.timestamp, d.total]; });

    var tooltipStyle = getTooltipStyle(colors, dark);

    function fmtDate(val) {
      var d = new Date(val);
      var locale = lang === 'zh' ? 'zh-TW' : 'en-US';
      return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    }

    function fmtDateTime(val) {
      var d = new Date(val);
      var locale = lang === 'zh' ? 'zh-TW' : 'en-US';
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) +
        ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }

    var option = {
      backgroundColor: 'transparent',
      animation: false,

      tooltip: Object.assign({
        trigger: 'axis',
        padding: [10, 14],
        formatter: function (params) {
          if (!params || !params.length) return '';
          var dateStr = fmtDateTime(params[0].value[0]);
          var html = '<div style="font-weight:600;margin-bottom:6px;font-size:13px">' + dateStr + '</div>';
          for (var i = 0; i < params.length; i++) {
            html += '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:12px">' +
              '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + params[i].color + '"></span>' +
              '<span>' + params[i].seriesName + '</span>' +
              '<span style="margin-left:auto;font-weight:600">' + Number(params[i].value[1]).toLocaleString() + '</span>' +
              '</div>';
          }
          return html;
        }
      }, tooltipStyle),

      legend: {
        data: [t('charts.sshd'), t('charts.asterisk'), t('charts.total')],
        top: 4,
        right: 16,
        textStyle: { color: colors.text, fontSize: 12 },
        icon: 'roundRect',
        itemWidth: 14,
        itemHeight: 8,
        itemGap: 16
      },

      grid: {
        top: 44,
        right: 16,
        bottom: 56,
        left: 56,
        containLabel: false
      },

      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: { lineStyle: { color: colors.grid } },
        axisTick: { lineStyle: { color: colors.grid } },
        axisLabel: {
          color: colors.text,
          fontSize: 11,
          formatter: function (val) { return fmtDate(val); }
        },
        splitLine: { show: false }
      },

      yAxis: {
        type: 'value',
        name: t('charts.attacks'),
        nameTextStyle: { color: colors.text, fontSize: 11, padding: [0, 0, 0, -30] },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: colors.text,
          fontSize: 11,
          formatter: function (val) {
            return val >= 1000 ? (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'k' : val;
          }
        },
        splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } }
      },

      dataZoom: [
        {
          type: 'slider',
          bottom: 8,
          height: 22,
          borderColor: colors.grid,
          backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          fillerColor: hexToRgba(colors.total, 0.12),
          handleStyle: { color: colors.total, borderColor: colors.total },
          textStyle: { color: colors.text, fontSize: 10 },
          dataBackground: {
            lineStyle: { color: colors.grid },
            areaStyle: { color: hexToRgba(colors.total, 0.08) }
          },
          selectedDataBackground: {
            lineStyle: { color: colors.total },
            areaStyle: { color: hexToRgba(colors.total, 0.15) }
          }
        },
        {
          type: 'inside',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true
        }
      ],

      series: [
        {
          name: t('charts.sshd'),
          type: 'line',
          smooth: true,
          symbol: 'none',
          connectNulls: false,
          lineStyle: { width: 1.5, color: colors.sshd },
          itemStyle: { color: colors.sshd },
          areaStyle: { color: areaGradient(colors.sshd) },
          emphasis: { focus: 'series' },
          data: sshdData
        },
        {
          name: t('charts.asterisk'),
          type: 'line',
          smooth: true,
          symbol: 'none',
          connectNulls: false,
          lineStyle: { width: 1.5, color: colors.asterisk },
          itemStyle: { color: colors.asterisk },
          areaStyle: { color: areaGradient(colors.asterisk) },
          emphasis: { focus: 'series' },
          data: asteriskData
        },
        {
          name: t('charts.total'),
          type: 'line',
          smooth: true,
          symbol: 'none',
          connectNulls: false,
          lineStyle: { width: 1.5, color: colors.total },
          itemStyle: { color: colors.total },
          areaStyle: { color: areaGradient(colors.total) },
          emphasis: { focus: 'series' },
          data: totalData
        }
      ]
    };

    chart.setOption(option, true);
  }

  // ============================================================
  // Relative Time Formatting
  // ============================================================

  /**
   * Format an ISO timestamp as a relative time string.
   * @param {string} isoTimestamp - ISO 8601 timestamp
   * @returns {string} Relative time string (e.g., "2 hours ago")
   */
  function formatRelativeTime(isoTimestamp) {
    if (!isoTimestamp) return '--';

    var now = new Date();
    var date = new Date(isoTimestamp);
    var diffMs = now - date;

    if (isNaN(diffMs)) return isoTimestamp;

    var diffSec = Math.floor(diffMs / 1000);
    var diffMin = Math.floor(diffSec / 60);
    var diffHr = Math.floor(diffMin / 60);
    var diffDay = Math.floor(diffHr / 24);

    var lang = getCurrentLang();
    var locale = lang === 'zh' ? 'zh-TW' : 'en-US';

    if (diffSec < 60) {
      return t('time.justNow');
    } else if (diffMin < 60) {
      return diffMin + ' ' + t('time.minutesAgo');
    } else if (diffHr < 24) {
      return diffHr + ' ' + t('time.hoursAgo');
    } else if (diffDay < 30) {
      return diffDay + ' ' + t('time.daysAgo', { count: diffDay });
    } else {
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  // ============================================================
  // Top IPs Table Rendering
  // ============================================================

  /**
   * Render the Top Attacking IPs ranking table.
   * @param {Array} data - Array of top IP objects from data.topIPs
   */
  function renderTopIPsTable(data) {
    var tbody = document.getElementById('top-ips-body');
    if (!tbody) return;

    // Handle empty/null data
    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="7">' +
        '<div class="empty-state">' + t('topIPs.noData') + '</div>' +
        '</td></tr>';
      return;
    }

    var html = '';

    for (var i = 0; i < data.length; i++) {
      var entry = data[i];
      var rank = i + 1;
      var isBanned = entry.isBanned || false;
      var flag = getCountryFlag(entry.country);
      var countryDisplay = flag ? flag + ' ' + (entry.country || '--') : (entry.country || '--');
      var statusClass = isBanned ? 'ip-banned' : 'ip-active';
      var statusText = isBanned ? t('topIPs.banned') : t('topIPs.active');
      var rowClass = isBanned ? ' ip-table__row--banned' : '';

      html += '<tr class="' + statusClass + rowClass + '">' +
        '<td class="ip-table__rank">' + rank + '</td>' +
        '<td class="ip-table__ip">' + escapeHtml(entry.ip || '--') + '</td>' +
        '<td class="ip-table__country">' + escapeHtml(countryDisplay) + '</td>' +
        '<td class="ip-table__count">' + Number(entry.count || 0).toLocaleString() + '</td>' +
        '<td class="ip-table__jail">' + escapeHtml(entry.jail || '--') + '</td>' +
        '<td class="ip-table__last-seen">' + formatRelativeTime(entry.lastSeen) + '</td>' +
        '<td class="ip-table__status">' +
          '<span class="ip-status-badge ip-status-badge--' + (isBanned ? 'banned' : 'active') + '">' +
            statusText +
          '</span>' +
        '</td>' +
        '</tr>';
    }

    tbody.innerHTML = html;
  }

  // ============================================================
  // Resize Handler
  // ============================================================

  /**
   * Resize all chart instances on window resize.
   */
  function handleResize() {
    Object.keys(chartInstances).forEach(function (id) {
      if (chartInstances[id] && !chartInstances[id].isDisposed()) {
        chartInstances[id].resize();
      }
    });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 150);
  });

  // ============================================================
  // Theme & i18n Change Handlers
  // ============================================================

  /**
   * Re-render all charts when theme or language changes.
   * @param {object} data - Current dashboard data for re-rendering
   */
  function refreshChartsOnThemeChange(data) {
    if (data && data.trends) {
      renderTrendChart('chart-trend', data.trends, 'all');
    }
    if (_timelineRenderParams) {
      renderTimelineChart(
        _timelineRenderParams.containerId,
        _timelineRenderParams.data,
        _timelineRenderParams.timeRange
      );
    }
    if (_heatmapRenderParams) {
      renderHeatmap(
        _heatmapRenderParams.containerId,
        _heatmapRenderParams.data
      );
    }
    if (_worldMapRenderParams) {
      renderWorldMap(
        _worldMapRenderParams.containerId,
        _worldMapRenderParams.topIPs
      );
    }
    if (_jailStatsRenderParams) {
      renderJailStats(
        _jailStatsRenderParams.containerId,
        _jailStatsRenderParams.data
      );
    }
    if (data && data.perJail && window._selectedJail && data.perJail[window._selectedJail]) {
      renderPerJailMiniChart(window._selectedJail, data);
    }
  }

  // ============================================================
  // Attack Heatmap (Hour × Day)
  // ============================================================

  /** Store last render params for heatmap re-render on theme/i18n change */
  var _heatmapRenderParams = null;

  /**
   * Render the attack heatmap (hour × day) using ECharts.
   * @param {string} containerId - DOM element ID (e.g., 'chart-heatmap')
   * @param {object} data - Dashboard data containing heatmap.grid (7×24 matrix)
   */
  function renderHeatmap(containerId, data) {
    var chart = getChartInstance(containerId);
    if (!chart) return;

    // Store params for re-render on theme/i18n change
    _heatmapRenderParams = { containerId: containerId, data: data };

    var grid = (data && data.heatmap && data.heatmap.grid) ? data.heatmap.grid : null;
    if (!grid || !grid.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: t('errors.noData'),
          left: 'center',
          top: 'center',
          textStyle: { color: getCSSVar('--text-muted'), fontSize: 14 }
        }
      });
      return;
    }

    var colors = getChartColors();
    var dark = isDarkTheme();

    // Day names: Mon(0) .. Sun(6) — i18n-aware
    var dayNames = [
      t('heatmap.monday'),
      t('heatmap.tuesday'),
      t('heatmap.wednesday'),
      t('heatmap.thursday'),
      t('heatmap.friday'),
      t('heatmap.saturday'),
      t('heatmap.sunday')
    ];

    // Hour labels: "00:00" .. "23:00"
    var hours = [];
    for (var h = 0; h < 24; h++) {
      hours.push((h < 10 ? '0' : '') + h + ':00');
    }

    // Build ECharts heatmap data: [hourIndex, dayIndex, value]
    var heatData = [];
    var maxVal = 0;
    for (var di = 0; di < grid.length; di++) {
      var row = grid[di];
      for (var hi = 0; hi < row.length; hi++) {
        var val = row[hi] || 0;
        heatData.push([hi, di, val]);
        if (val > maxVal) maxVal = val;
      }
    }

    // Theme-aware gradient colors
    var inRangeColor = dark
      ? ['#1a1c2b', '#f87171']
      : ['#e8eaf0', '#dc2626'];

    var option = {
      backgroundColor: 'transparent',
      animation: false,

      tooltip: Object.assign({
        padding: [8, 12],
        formatter: function (params) {
          if (!params || params.value == null) return '';
          var dayIdx = params.value[1];
          var hourIdx = params.value[0];
          var count = params.value[2];
          return '<b>' + dayNames[dayIdx] + '</b> ' + hours[hourIdx] +
            '<br/>' + t('charts.attacks') + ': <b>' + count.toLocaleString() + '</b>';
        }
      }, getTooltipStyle(colors, dark)),

      grid: {
        top: 10,
        right: 60,
        bottom: 30,
        left: 60,
        containLabel: false
      },

      xAxis: {
        type: 'category',
        data: hours,
        position: 'bottom',
        axisLine: { lineStyle: { color: colors.grid } },
        axisTick: { show: false },
        axisLabel: {
          color: colors.text,
          fontSize: 10,
          interval: 2
        },
        splitLine: { show: false }
      },

      yAxis: {
        type: 'category',
        data: dayNames,
        axisLine: { lineStyle: { color: colors.grid } },
        axisTick: { show: false },
        axisLabel: {
          color: colors.text,
          fontSize: 11
        },
        splitLine: { show: false }
      },

      visualMap: {
        min: 0,
        max: maxVal || 1,
        calculable: false,
        orient: 'vertical',
        right: 4,
        top: 'center',
        itemHeight: 160,
        itemWidth: 12,
        text: [String(maxVal), '0'],
        textStyle: { color: colors.text, fontSize: 10 },
        inRange: {
          color: inRangeColor
        },
        outOfRange: {
          color: dark ? '#1a1c2b' : '#e8eaf0'
        }
      },

      series: [{
        type: 'heatmap',
        data: heatData,
        itemStyle: {
          borderColor: dark ? '#0f1117' : '#ffffff',
          borderWidth: 2,
          borderRadius: 2
        },
        emphasis: {
          itemStyle: {
            borderColor: colors.total,
            borderWidth: 2,
            shadowBlur: 6,
            shadowColor: 'rgba(0,0,0,0.3)'
          }
        },
        progressive: 0
      }]
    };

    chart.setOption(option, true);
  }

// ============================================================
  // World Map Choropleth
  // ============================================================

  var _worldMapRegistered = false;
  var _worldMapRegistering = false;
  var _worldMapQueue = [];

  function registerWorldMapAndRender(containerId, topIPs) {
    if (_worldMapRegistered) {
      renderWorldMap(containerId, topIPs);
      return;
    }

    _worldMapQueue.push({ containerId: containerId, topIPs: topIPs });

    if (_worldMapRegistering) return;
    _worldMapRegistering = true;

    var mapUrl = 'data/world.json';

    fetch(mapUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (geoJson) {
        echarts.registerMap('world', geoJson);
        _worldMapRegistered = true;
        _worldMapRegistering = false;
        for (var i = 0; i < _worldMapQueue.length; i++) {
          renderWorldMap(_worldMapQueue[i].containerId, _worldMapQueue[i].topIPs);
        }
        _worldMapQueue = [];
      })
      .catch(function (err) {
        console.error('World map GeoJSON load failed:', err);
        _worldMapRegistering = false;
        // Show fallback for all queued requests
        for (var i = 0; i < _worldMapQueue.length; i++) {
          renderWorldMapFallback(_worldMapQueue[i].containerId, _worldMapQueue[i].topIPs);
        }
        _worldMapQueue = [];
      });
  }

  /**
   * Country name aliases — maps common data names to ECharts world map names.
   * ECharts uses names from the world.json Geo data (mostly Natural Earth).
   */
  var COUNTRY_NAME_MAP = {
    'United States': 'United States of America',
    'The Netherlands': 'Netherlands',
    'South Korea': 'Korea',
    'Russia': 'Russia',
    'Vietnam': 'Vietnam',
    'Turkey': 'Turkey',
    'Iran': 'Iran',
    'Czech Republic': 'Czech Rep.',
    'Hong Kong': 'China',
    'Taiwan': 'China',
    'New Zealand': 'New Zealand'
  };

  /**
   * Aggregate topIPs data by country for the world map.
   * Excludes special labels (Internal/Private, IPv6, Unknown) from map data
   * but returns them separately for legend display.
   * @param {Array} topIPs - Array of IP entry objects
   * @returns {{ mapData: Array<{name:string, value:number, ipCount:number}>, specialLabels: Array<{label:string, count:number, ipCount:number}> }}
   */
  function aggregateByCountry(topIPs) {
    if (!topIPs || !topIPs.length) {
      return { mapData: [], specialLabels: [] };
    }

    var countryMap = {};
    var specialLabels = [];
    var specialKeys = [
      { match: function (e) { return e.isPrivate; }, label: t('map.internalPrivate') },
      { match: function (e) { return e.isIPv6; }, label: t('map.ipv6Unavailable') },
      { match: function (e) { return !e.country || e.country === 'Unknown'; }, label: t('map.unknown') }
    ];

    for (var i = 0; i < topIPs.length; i++) {
      var entry = topIPs[i];
      var isSpecial = false;

      for (var s = 0; s < specialKeys.length; s++) {
        if (specialKeys[s].match(entry)) {
          isSpecial = true;
          var existing = null;
          for (var k = 0; k < specialLabels.length; k++) {
            if (specialLabels[k].label === specialKeys[s].label) {
              existing = specialLabels[k];
              break;
            }
          }
          if (existing) {
            existing.count += entry.count || 0;
            existing.ipCount += 1;
          } else {
            specialLabels.push({ label: specialKeys[s].label, count: entry.count || 0, ipCount: 1 });
          }
          break;
        }
      }

      if (isSpecial) continue;

      var rawCountry = entry.country || 'Unknown';
      var mapName = COUNTRY_NAME_MAP[rawCountry] || rawCountry;

      if (countryMap[mapName]) {
        countryMap[mapName].value += entry.count || 0;
        countryMap[mapName].ipCount += 1;
      } else {
        countryMap[mapName] = { name: mapName, value: entry.count || 0, ipCount: 1 };
      }
    }

    var mapData = [];
    for (var key in countryMap) {
      if (countryMap.hasOwnProperty(key)) {
        mapData.push(countryMap[key]);
      }
    }

    return { mapData: mapData, specialLabels: specialLabels };
  }

  var _worldMapRenderParams = null;

  /**
   * Render the world map choropleth showing attack sources by country.
   * @param {string} containerId - DOM element ID (e.g., 'chart-world-map')
   * @param {Array} topIPs - Array of top IP objects with country, count, isPrivate, isIPv6
   */
  function renderWorldMap(containerId, topIPs) {
    _worldMapRenderParams = { containerId: containerId, topIPs: topIPs };

    if (!_worldMapRegistered) {
      registerWorldMapAndRender(containerId, topIPs);
      return;
    }

    var chart = getChartInstance(containerId);
    if (!chart) return;

    if (!topIPs || !topIPs.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: t('errors.noData'),
          left: 'center',
          top: 'center',
          textStyle: { color: getCSSVar('--text-muted'), fontSize: 14 }
        }
      });
      return;
    }

    var colors = getChartColors();
    var dark = isDarkTheme();

    var aggregated = aggregateByCountry(topIPs);
    var mapData = aggregated.mapData;
    var specialLabels = aggregated.specialLabels;

    var maxVal = 0;
    for (var i = 0; i < mapData.length; i++) {
      if (mapData[i].value > maxVal) maxVal = mapData[i].value;
    }
    if (maxVal < 1) maxVal = 1;

    var legendData = [];
    for (var c = 0; c < mapData.length; c++) {
      legendData.push(mapData[c].name);
    }
    for (var sp = 0; sp < specialLabels.length; sp++) {
      legendData.push(specialLabels[sp].label);
    }

    var accentColor = colors.total || '#ef4444';
    var lowColor = dark ? hexToRgba(accentColor, 0.15) : hexToRgba(accentColor, 0.1);
    var highColor = accentColor;

    var option = {
      backgroundColor: 'transparent',
      animation: false,

      tooltip: Object.assign({
        trigger: 'item',
        padding: [10, 14],
        formatter: function (params) {
          if (!params.data || params.data.value == null) {
            return params.name;
          }
          var d = params.data;
          var html = '<div style="font-weight:600;margin-bottom:4px">' + params.name + '</div>';
          html += '<div style="font-size:12px">' +
            t('map.attacksFrom') + ': <b>' + d.value.toLocaleString() + '</b></div>';
          html += '<div style="font-size:12px;color:' + (dark ? '#9ca3af' : '#6b7280') + '">' +
            'IPs: ' + d.ipCount + '</div>';
          return html;
        }
      }, getTooltipStyle(colors, dark)),

      visualMap: {
        min: 0,
        max: maxVal,
        left: 20,
        bottom: 20,
        text: [t('charts.count') + ' \u2191', '\u2193'],
        textStyle: { color: colors.text, fontSize: 11 },
        inRange: {
          color: [lowColor, highColor]
        },
        calculable: true,
        handleStyle: { color: accentColor, borderColor: accentColor },
        itemWidth: 12,
        itemHeight: 120
      },

      series: [
        {
          name: t('map.title') || 'Attacks',
          type: 'map',
          map: 'world',
          roam: true,
          data: mapData,
          emphasis: {
            label: { show: true, color: '#fff', fontSize: 12 },
            itemStyle: { areaColor: accentColor, borderColor: '#fff', borderWidth: 1 }
          },
          itemStyle: {
            borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            borderWidth: 0.5,
            areaColor: dark ? '#1e2030' : '#e8eaf0'
          },
          label: { show: false },
          selectedMode: false
        }
      ]
    };

    chart.setOption(option, true);
  }

  /**
   * Render a fallback country list table when the world map cannot load.
   * @param {string} containerId - DOM element ID
   * @param {Array} topIPs - Array of top IP objects
   */
  function renderWorldMapFallback(containerId, topIPs) {
    var dom = document.getElementById(containerId);
    if (!dom) return;

    // Destroy any existing chart instance
    if (chartInstances[containerId]) {
      chartInstances[containerId].dispose();
      delete chartInstances[containerId];
    }

    var aggregated = aggregateByCountry(topIPs || []);
    var mapData = aggregated.mapData;
    var specialLabels = aggregated.specialLabels;

    // Sort by attack count descending
    mapData.sort(function (a, b) { return b.value - a.value; });

    var html = '<div class="world-map-fallback">' +
      '<div class="world-map-fallback__notice">Map unavailable (GeoJSON failed to load). Showing country list instead.</div>' +
      '<div class="ip-table-wrapper"><table class="ip-table">' +
      '<thead><tr>' +
        '<th>#</th>' +
        '<th>Country</th>' +
        '<th>Attacks</th>' +
        '<th>IPs</th>' +
      '</tr></thead><tbody>';

    for (var i = 0; i < mapData.length; i++) {
      var entry = mapData[i];
      html += '<tr>' +
        '<td class="ip-table__rank">' + (i + 1) + '</td>' +
        '<td class="ip-table__country">' + escapeHtml(entry.name) + '</td>' +
        '<td class="ip-table__count">' + Number(entry.value).toLocaleString() + '</td>' +
        '<td>' + entry.ipCount + '</td>' +
      '</tr>';
    }

    html += '</tbody></table></div>';

    if (specialLabels.length) {
      html += '<div class="world-map-fallback__special">';
      for (var s = 0; s < specialLabels.length; s++) {
        html += '<span>' + escapeHtml(specialLabels[s].label) + ': ' + specialLabels[s].count + ' (' + specialLabels[s].ipCount + ' IPs)</span>';
      }
      html += '</div>';
    }

    html += '</div>';
    dom.innerHTML = html;
  }

// ============================================================
  // Per-Jail Mini Chart
  // ============================================================

  /**
   * Render a mini bar chart for per-jail attack trend.
   * Shows the last 7 days of attack data for the selected jail.
   * @param {string} jail - Jail name ('sshd' or 'asterisk')
   * @param {object} data - Full dashboard JSON object
   */
  function renderPerJailMiniChart(jail, data) {
    var chartId = 'jail-attack-trend-chart';
    var chart = getChartInstance(chartId);
    if (!chart) return;

    var jailData = data.perJail[jail];
    if (!jailData || !jailData.attackTrend || !jailData.attackTrend.length) {
      chart.clear();
      chart.setOption({
        title: {
          text: t('errors.noData'),
          left: 'center',
          top: 'center',
          textStyle: { color: getCSSVar('--text-muted'), fontSize: 14 }
        }
      });
      return;
    }

    var colors = getChartColors();
    var dark = isDarkTheme();
    var jailColor = jail === 'sshd' ? colors.sshd : colors.asterisk;
    var jailLabel = jail === 'sshd' ? t('charts.sshd') : t('charts.asterisk');

    var trends = data.trends || [];
    var attackTrend = jailData.attackTrend;
    var dates = [];
    var values = [];

    var startIdx = 0;
    for (var i = startIdx; i < attackTrend.length; i++) {
      if (i < trends.length) {
        dates.push(trends[i].date);
      } else {
        dates.push('Day ' + (i + 1));
      }
      values.push(attackTrend[i]);
    }

    var displayDates = dates.map(function (d) {
      if (dates.length > 5) {
        var parts = d.split('-');
        return parts.length >= 3 ? parts[1] + '-' + parts[2] : d;
      }
      return d;
    });

    var option = {
      backgroundColor: 'transparent',
      animation: false,

      tooltip: Object.assign({
        trigger: 'axis',
        textStyle: { fontSize: 12 },
        formatter: function (params) {
          if (!params || !params.length) return '';
          var dateStr = dates[params[0].dataIndex] || params[0].axisValue;
          return '<b>' + dateStr + '</b><br/>' +
            params[0].seriesName + ': <b>' + Number(params[0].value).toLocaleString() + '</b>';
        }
      }, getTooltipStyle(colors, dark), {
        textStyle: { color: dark ? '#e8eaf0' : '#1a1c2b', fontSize: 12 }
      }),

      grid: {
        left: 50,
        right: 16,
        top: 16,
        bottom: 30,
        containLabel: false
      },

      xAxis: {
        type: 'category',
        data: displayDates,
        axisLine: { lineStyle: { color: colors.grid } },
        axisTick: { lineStyle: { color: colors.grid } },
        axisLabel: {
          color: colors.text,
          fontSize: 11,
          rotate: dates.length > 5 ? 45 : 0
        },
        splitLine: { show: false }
      },

      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: colors.text,
          fontSize: 11,
          formatter: function (val) {
            return val >= 1000 ? (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'k' : val;
          }
        },
        splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } }
      },

      series: [{
        name: jailLabel,
        type: 'bar',
        data: values,
        itemStyle: {
          color: jailColor,
          borderRadius: [3, 3, 0, 0]
        },
        barMaxWidth: 24,
        emphasis: {
          itemStyle: { opacity: 0.85 }
        }
      }]
    };

    chart.setOption(option, true);
  }

  // ============================================================
  // Jail Statistics (Donut Chart + Per-Jail Cards)
  // ============================================================

  /** Store last render params for jail stats re-render on theme/i18n change */
  var _jailStatsRenderParams = null;

  /**
   * Render the jail classification donut chart and per-jail detail cards.
   * @param {string} containerId - DOM element ID for the chart container
   * @param {object} data - Dashboard data with jails and perJail objects
   */
  function renderJailStats(containerId, data) {
    if (!data || !data.jails) return;

    // Store params for re-render on theme/i18n change
    _jailStatsRenderParams = { containerId: containerId, data: data };

    var chart = getChartInstance(containerId);
    if (!chart) return;

    var colors = getChartColors();
    var dark = isDarkTheme();

    // Map jail names to colors and i18n labels
    var jailColorMap = {
      sshd: colors.sshd,
      asterisk: colors.asterisk
    };

    var jailLabelMap = {
      sshd: t('charts.sshd'),
      asterisk: t('charts.asterisk')
    };

    // Build pie data from jails
    var pieData = [];
    var totalAttacks = 0;
    var jailNames = Object.keys(data.jails);

    for (var i = 0; i < jailNames.length; i++) {
      var name = jailNames[i];
      var jailData = data.jails[name];
      var attacks = jailData.attacks || 0;
      totalAttacks += attacks;
      pieData.push({
        name: jailLabelMap[name] || name,
        value: attacks,
        itemStyle: { color: jailColorMap[name] || colors.total }
      });
    }

    // Handle empty data
    if (!pieData.length || totalAttacks === 0) {
      chart.clear();
      chart.setOption({
        title: {
          text: t('errors.noData'),
          left: 'center',
          top: 'center',
          textStyle: { color: getCSSVar('--text-muted'), fontSize: 14 }
        }
      });
      return;
    }

    var tooltipTextColor = dark ? '#e8eaf0' : '#1a1c2b';

    var option = {
      backgroundColor: 'transparent',
      animation: false,

      tooltip: Object.assign({
        trigger: 'item',
        padding: [10, 14],
        formatter: function (params) {
          return '<div style="display:flex;align-items:center;gap:6px;margin:2px 0">' +
            '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + params.color + '"></span>' +
            '<span>' + params.name + '</span>' +
            '<span style="margin-left:auto;font-weight:600">' + params.value.toLocaleString() + '</span>' +
            '</div>' +
            '<div style="font-size:12px;color:' + tooltipTextColor + ';opacity:0.7;margin-top:2px">' +
            params.percent + '%</div>';
        }
      }, getTooltipStyle(colors, dark)),

      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        textStyle: { color: colors.text, fontSize: 12 },
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 20,
        formatter: function (name) {
          for (var i = 0; i < pieData.length; i++) {
            if (pieData[i].name === name) {
              var pct = totalAttacks > 0 ? ((pieData[i].value / totalAttacks) * 100).toFixed(1) : '0.0';
              return name + '  ' + pct + '%';
            }
          }
          return name;
        }
      },

      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '38%',
          style: {
            text: totalAttacks.toLocaleString(),
            textAlign: 'center',
            fill: colors.text,
            fontSize: 22,
            fontWeight: 700
          }
        },
        {
          type: 'text',
          left: 'center',
          top: '48%',
          style: {
            text: t('jailStats.totalAttacks'),
            textAlign: 'center',
            fill: colors.text,
            fontSize: 11,
            opacity: 0.7
          }
        }
      ],

      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            label: { show: false },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          data: pieData
        }
      ]
    };

    chart.setOption(option, true);
  }

  // ============================================================
  // Public API
  // ============================================================

  window.renderTrendChart = renderTrendChart;
  window.renderTimelineChart = renderTimelineChart;
  window.renderTopIPsTable = renderTopIPsTable;
  window.renderHeatmap = renderHeatmap;
  window.renderWorldMap = renderWorldMap;
  window.renderJailStats = renderJailStats;
  window.getChartInstance = getChartInstance;
  window.refreshChartsOnThemeChange = refreshChartsOnThemeChange;
  window.getCSSVar = getCSSVar;
  window.getChartColors = getChartColors;
  window.renderPerJailMiniChart = renderPerJailMiniChart;
  window.renderWorldMapFallback = renderWorldMapFallback;
  window.disposeChartInstance = function (id) {
    if (chartInstances[id]) {
      chartInstances[id].dispose();
      delete chartInstances[id];
    }
  };

})();