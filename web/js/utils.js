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
   * Comprehensive map of country/territory names to flag emoji using regional
   * indicator symbols. Covers UN member states and common territories.
   */
  var COUNTRY_FLAGS = {
    'Afghanistan' : '\uD83C\uDDE6\uD83C\uDDEB',
    'Albania' : '\uD83C\uDDE6\uD83C\uDDF1',
    'Algeria' : '\uD83C\uDDE9\uD83C\uDDFF',
    'American Samoa' : '\uD83C\uDDE6\uD83C\uDDF8',
    'Andorra' : '\uD83C\uDDE6\uD83C\uDDE9',
    'Angola' : '\uD83C\uDDE6\uD83C\uDDF4',
    'Anguilla' : '\uD83C\uDDE6\uD83C\uDDEE',
    'Antarctica' : '\uD83C\uDDE6\uD83C\uDDF6',
    'Antigua & Barbuda' : '\uD83C\uDDE6\uD83C\uDDEC',
    'Argentina' : '\uD83C\uDDE6\uD83C\uDDF7',
    'Armenia' : '\uD83C\uDDE6\uD83C\uDDF2',
    'Aruba' : '\uD83C\uDDE6\uD83C\uDDFC',
    'Ascension Island' : '\uD83C\uDDE6\uD83C\uDDE8',
    'Australia' : '\uD83C\uDDE6\uD83C\uDDFA',
    'Austria' : '\uD83C\uDDE6\uD83C\uDDF9',
    'Azerbaijan' : '\uD83C\uDDE6\uD83C\uDDFF',
    'Bahamas' : '\uD83C\uDDE7\uD83C\uDDF8',
    'Bahrain' : '\uD83C\uDDE7\uD83C\uDDED',
    'Bangladesh' : '\uD83C\uDDE7\uD83C\uDDE9',
    'Barbados' : '\uD83C\uDDE7\uD83C\uDDF7',
    'Belarus' : '\uD83C\uDDE7\uD83C\uDDFE',
    'Belgium' : '\uD83C\uDDE7\uD83C\uDDEA',
    'Belize' : '\uD83C\uDDE7\uD83C\uDDFF',
    'Benin' : '\uD83C\uDDE7\uD83C\uDDEF',
    'Bermuda' : '\uD83C\uDDE7\uD83C\uDDF2',
    'Bhutan' : '\uD83C\uDDE7\uD83C\uDDF9',
    'Bolivia' : '\uD83C\uDDE7\uD83C\uDDF4',
    'Bosnia & Herzegovina' : '\uD83C\uDDE7\uD83C\uDDE6',
    'Botswana' : '\uD83C\uDDE7\uD83C\uDDFC',
    'Bouvet Island' : '\uD83C\uDDE7\uD83C\uDDFB',
    'Brazil' : '\uD83C\uDDE7\uD83C\uDDF7',
    'British Indian Ocean Territory' : '\uD83C\uDDEE\uD83C\uDDF4',
    'British Virgin Islands' : '\uD83C\uDDFB\uD83C\uDDEC',
    'Brunei' : '\uD83C\uDDE7\uD83C\uDDF3',
    'Bulgaria' : '\uD83C\uDDE7\uD83C\uDDEC',
    'Burkina Faso' : '\uD83C\uDDE7\uD83C\uDDEB',
    'Burundi' : '\uD83C\uDDE7\uD83C\uDDEE',
    'Cambodia' : '\uD83C\uDDF0\uD83C\uDDED',
    'Cameroon' : '\uD83C\uDDE8\uD83C\uDDF2',
    'Canada' : '\uD83C\uDDE8\uD83C\uDDE6',
    'Canary Islands' : '\uD83C\uDDEE\uD83C\uDDE8',
    'Cape Verde' : '\uD83C\uDDE8\uD83C\uDDFB',
    'Caribbean Netherlands' : '\uD83C\uDDE7\uD83C\uDDF6',
    'Cayman Islands' : '\uD83C\uDDF0\uD83C\uDDFE',
    'Central African Republic' : '\uD83C\uDDE8\uD83C\uDDEB',
    'Ceuta & Melilla' : '\uD83C\uDDEA\uD83C\uDDE6',
    'Chad' : '\uD83C\uDDF9\uD83C\uDDE9',
    'Chile' : '\uD83C\uDDE8\uD83C\uDDF1',
    'China' : '\uD83C\uDDE8\uD83C\uDDF3',
    'Christmas Island' : '\uD83C\uDDE8\uD83C\uDDFD',
    'Clipperton Island' : '\uD83C\uDDE8\uD83C\uDDF5',
    'Cocos (Keeling) Islands' : '\uD83C\uDDE8\uD83C\uDDE8',
    'Colombia' : '\uD83C\uDDE8\uD83C\uDDF4',
    'Comoros' : '\uD83C\uDDF0\uD83C\uDDF2',
    'Congo - Brazzaville' : '\uD83C\uDDE8\uD83C\uDDEC',
    'Congo - Kinshasa' : '\uD83C\uDDE8\uD83C\uDDE9',
    'Cook Islands' : '\uD83C\uDDE8\uD83C\uDDF0',
    'Costa Rica' : '\uD83C\uDDE8\uD83C\uDDF7',
    'Croatia' : '\uD83C\uDDED\uD83C\uDDF7',
    'Cuba' : '\uD83C\uDDE8\uD83C\uDDFA',
    'Curaçao' : '\uD83C\uDDE8\uD83C\uDDFC',
    'Cyprus' : '\uD83C\uDDE8\uD83C\uDDFE',
    'Czech Republic' : '\uD83C\uDDE8\uD83C\uDDFF',
    'Czechia' : '\uD83C\uDDE8\uD83C\uDDFF',
    "Côte d’Ivoire" : '\uD83C\uDDE8\uD83C\uDDEE',
    'Denmark' : '\uD83C\uDDE9\uD83C\uDDF0',
    'Diego Garcia' : '\uD83C\uDDE9\uD83C\uDDEC',
    'Djibouti' : '\uD83C\uDDE9\uD83C\uDDEF',
    'Dominica' : '\uD83C\uDDE9\uD83C\uDDF2',
    'Dominican Republic' : '\uD83C\uDDE9\uD83C\uDDF4',
    'Ecuador' : '\uD83C\uDDEA\uD83C\uDDE8',
    'Egypt' : '\uD83C\uDDEA\uD83C\uDDEC',
    'El Salvador' : '\uD83C\uDDF8\uD83C\uDDFB',
    'England' : '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
    'Equatorial Guinea' : '\uD83C\uDDEC\uD83C\uDDF6',
    'Eritrea' : '\uD83C\uDDEA\uD83C\uDDF7',
    'Estonia' : '\uD83C\uDDEA\uD83C\uDDEA',
    'Eswatini' : '\uD83C\uDDF8\uD83C\uDDFF',
    'Ethiopia' : '\uD83C\uDDEA\uD83C\uDDF9',
    'European Union' : '\uD83C\uDDEA\uD83C\uDDFA',
    'Falkland Islands' : '\uD83C\uDDEB\uD83C\uDDF0',
    'Faroe Islands' : '\uD83C\uDDEB\uD83C\uDDF4',
    'Fiji' : '\uD83C\uDDEB\uD83C\uDDEF',
    'Finland' : '\uD83C\uDDEB\uD83C\uDDEE',
    'France' : '\uD83C\uDDEB\uD83C\uDDF7',
    'French Guiana' : '\uD83C\uDDEC\uD83C\uDDEB',
    'French Polynesia' : '\uD83C\uDDF5\uD83C\uDDEB',
    'French Southern Territories' : '\uD83C\uDDF9\uD83C\uDDEB',
    'Gabon' : '\uD83C\uDDEC\uD83C\uDDE6',
    'Gambia' : '\uD83C\uDDEC\uD83C\uDDF2',
    'Georgia' : '\uD83C\uDDEC\uD83C\uDDEA',
    'Germany' : '\uD83C\uDDE9\uD83C\uDDEA',
    'Ghana' : '\uD83C\uDDEC\uD83C\uDDED',
    'Gibraltar' : '\uD83C\uDDEC\uD83C\uDDEE',
    'Greece' : '\uD83C\uDDEC\uD83C\uDDF7',
    'Greenland' : '\uD83C\uDDEC\uD83C\uDDF1',
    'Grenada' : '\uD83C\uDDEC\uD83C\uDDE9',
    'Guadeloupe' : '\uD83C\uDDEC\uD83C\uDDF5',
    'Guam' : '\uD83C\uDDEC\uD83C\uDDFA',
    'Guatemala' : '\uD83C\uDDEC\uD83C\uDDF9',
    'Guernsey' : '\uD83C\uDDEC\uD83C\uDDEC',
    'Guinea' : '\uD83C\uDDEC\uD83C\uDDF3',
    'Guinea-Bissau' : '\uD83C\uDDEC\uD83C\uDDFC',
    'Guyana' : '\uD83C\uDDEC\uD83C\uDDFE',
    'Haiti' : '\uD83C\uDDED\uD83C\uDDF9',
    'Heard & McDonald Islands' : '\uD83C\uDDED\uD83C\uDDF2',
    'Honduras' : '\uD83C\uDDED\uD83C\uDDF3',
    'Hong Kong' : '\uD83C\uDDED\uD83C\uDDF0',
    'Hong Kong SAR China' : '\uD83C\uDDED\uD83C\uDDF0',
    'Hungary' : '\uD83C\uDDED\uD83C\uDDFA',
    'Iceland' : '\uD83C\uDDEE\uD83C\uDDF8',
    'India' : '\uD83C\uDDEE\uD83C\uDDF3',
    'Indonesia' : '\uD83C\uDDEE\uD83C\uDDE9',
    'Iran' : '\uD83C\uDDEE\uD83C\uDDF7',
    'Iraq' : '\uD83C\uDDEE\uD83C\uDDF6',
    'Ireland' : '\uD83C\uDDEE\uD83C\uDDEA',
    'Isle of Man' : '\uD83C\uDDEE\uD83C\uDDF2',
    'Israel' : '\uD83C\uDDEE\uD83C\uDDF1',
    'Italy' : '\uD83C\uDDEE\uD83C\uDDF9',
    'Jamaica' : '\uD83C\uDDEF\uD83C\uDDF2',
    'Japan' : '\uD83C\uDDEF\uD83C\uDDF5',
    'Jersey' : '\uD83C\uDDEF\uD83C\uDDEA',
    'Jordan' : '\uD83C\uDDEF\uD83C\uDDF4',
    'Kazakhstan' : '\uD83C\uDDF0\uD83C\uDDFF',
    'Kenya' : '\uD83C\uDDF0\uD83C\uDDEA',
    'Kiribati' : '\uD83C\uDDF0\uD83C\uDDEE',
    'Kosovo' : '\uD83C\uDDFD\uD83C\uDDF0',
    'Kuwait' : '\uD83C\uDDF0\uD83C\uDDFC',
    'Kyrgyzstan' : '\uD83C\uDDF0\uD83C\uDDEC',
    'Laos' : '\uD83C\uDDF1\uD83C\uDDE6',
    'Latvia' : '\uD83C\uDDF1\uD83C\uDDFB',
    'Lebanon' : '\uD83C\uDDF1\uD83C\uDDE7',
    'Lesotho' : '\uD83C\uDDF1\uD83C\uDDF8',
    'Liberia' : '\uD83C\uDDF1\uD83C\uDDF7',
    'Libya' : '\uD83C\uDDEE\uD83C\uDDF9',
    'Liechtenstein' : '\uD83C\uDDF1\uD83C\uDDEE',
    'Lithuania' : '\uD83C\uDDF1\uD83C\uDDF9',
    'Luxembourg' : '\uD83C\uDDF1\uD83C\uDDFA',
    'Macao' : '\uD83C\uDDF2\uD83C\uDDF4',
    'Macao SAR China' : '\uD83C\uDDF2\uD83C\uDDF4',
    'Madagascar' : '\uD83C\uDDF2\uD83C\uDDEC',
    'Malawi' : '\uD83C\uDDF2\uD83C\uDDFC',
    'Malaysia' : '\uD83C\uDDF2\uD83C\uDDFE',
    'Maldives' : '\uD83C\uDDF2\uD83C\uDDFB',
    'Mali' : '\uD83C\uDDF2\uD83C\uDDF1',
    'Malta' : '\uD83C\uDDF2\uD83C\uDDF9',
    'Marshall Islands' : '\uD83C\uDDF2\uD83C\uDDED',
    'Martinique' : '\uD83C\uDDF2\uD83C\uDDF6',
    'Mauritania' : '\uD83C\uDDF2\uD83C\uDDF7',
    'Mauritius' : '\uD83C\uDDF2\uD83C\uDDFA',
    'Mayotte' : '\uD83C\uDDFE\uD83C\uDDF9',
    'Mexico' : '\uD83C\uDDF2\uD83C\uDDFD',
    'Micronesia' : '\uD83C\uDDEB\uD83C\uDDF2',
    'Moldova' : '\uD83C\uDDF2\uD83C\uDDE9',
    'Monaco' : '\uD83C\uDDF2\uD83C\uDDE8',
    'Mongolia' : '\uD83C\uDDF2\uD83C\uDDF3',
    'Montenegro' : '\uD83C\uDDF2\uD83C\uDDEA',
    'Montserrat' : '\uD83C\uDDF2\uD83C\uDDF8',
    'Morocco' : '\uD83C\uDDF2\uD83C\uDDE6',
    'Mozambique' : '\uD83C\uDDF2\uD83C\uDDFF',
    'Myanmar (Burma)' : '\uD83C\uDDF2\uD83C\uDDF2',
    'Namibia' : '\uD83C\uDDF3\uD83C\uDDE6',
    'Nauru' : '\uD83C\uDDF3\uD83C\uDDF7',
    'Nepal' : '\uD83C\uDDF3\uD83C\uDDF5',
    'Netherlands' : '\uD83C\uDDF3\uD83C\uDDF1',
    'New Caledonia' : '\uD83C\uDDF3\uD83C\uDDE8',
    'New Zealand' : '\uD83C\uDDF3\uD83C\uDDFF',
    'Nicaragua' : '\uD83C\uDDF3\uD83C\uDDEE',
    'Niger' : '\uD83C\uDDF3\uD83C\uDDEA',
    'Nigeria' : '\uD83C\uDDF3\uD83C\uDDEC',
    'Niue' : '\uD83C\uDDF3\uD83C\uDDFA',
    'Norfolk Island' : '\uD83C\uDDF3\uD83C\uDDEB',
    'North Korea' : '\uD83C\uDDF0\uD83C\uDDF5',
    'North Macedonia' : '\uD83C\uDDF2\uD83C\uDDF0',
    'Northern Mariana Islands' : '\uD83C\uDDF2\uD83C\uDDF5',
    'Norway' : '\uD83C\uDDF3\uD83C\uDDF4',
    'Oman' : '\uD83C\uDDF4\uD83C\uDDF2',
    'Pakistan' : '\uD83C\uDDF5\uD83C\uDDF0',
    'Palau' : '\uD83C\uDDF5\uD83C\uDDFC',
    'Palestinian Territories' : '\uD83C\uDDF5\uD83C\uDDF8',
    'Panama' : '\uD83C\uDDF5\uD83C\uDDE6',
    'Papua New Guinea' : '\uD83C\uDDF5\uD83C\uDDEC',
    'Paraguay' : '\uD83C\uDDF5\uD83C\uDDFE',
    'Peru' : '\uD83C\uDDF5\uD83C\uDDEA',
    'Philippines' : '\uD83C\uDDF5\uD83C\uDDED',
    'Pitcairn Islands' : '\uD83C\uDDF5\uD83C\uDDF3',
    'Poland' : '\uD83C\uDDF5\uD83C\uDDF1',
    'Portugal' : '\uD83C\uDDF5\uD83C\uDDF9',
    'Puerto Rico' : '\uD83C\uDDF5\uD83C\uDDF7',
    'Qatar' : '\uD83C\uDDF6\uD83C\uDDE6',
    'Romania' : '\uD83C\uDDF7\uD83C\uDDF4',
    'Russia' : '\uD83C\uDDF7\uD83C\uDDFA',
    'Rwanda' : '\uD83C\uDDF7\uD83C\uDDFC',
    'Réunion' : '\uD83C\uDDF7\uD83C\uDDEA',
    'Samoa' : '\uD83C\uDDFC\uD83C\uDDF8',
    'San Marino' : '\uD83C\uDDF8\uD83C\uDDF2',
    'Saudi Arabia' : '\uD83C\uDDF8\uD83C\uDDE6',
    'Scotland' : '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F',
    'Senegal' : '\uD83C\uDDF8\uD83C\uDDF3',
    'Serbia' : '\uD83C\uDDF7\uD83C\uDDF8',
    'Seychelles' : '\uD83C\uDDF8\uD83C\uDDE8',
    'Sierra Leone' : '\uD83C\uDDF8\uD83C\uDDF1',
    'Singapore' : '\uD83C\uDDF8\uD83C\uDDEC',
    'Sint Maarten' : '\uD83C\uDDF8\uD83C\uDDFD',
    'Slovakia' : '\uD83C\uDDF8\uD83C\uDDF0',
    'Slovenia' : '\uD83C\uDDF8\uD83C\uDDEE',
    'Solomon Islands' : '\uD83C\uDDF8\uD83C\uDDE7',
    'Somalia' : '\uD83C\uDDF8\uD83C\uDDF4',
    'South Africa' : '\uD83C\uDDFF\uD83C\uDDE6',
    'South Georgia & South Sandwich Islands' : '\uD83C\uDDEC\uD83C\uDDF8',
    'South Korea' : '\uD83C\uDDF0\uD83C\uDDF7',
    'South Sudan' : '\uD83C\uDDF8\uD83C\uDDF8',
    'Spain' : '\uD83C\uDDEA\uD83C\uDDF8',
    'Sri Lanka' : '\uD83C\uDDF1\uD83C\uDDF0',
    'St. Barthélemy' : '\uD83C\uDDE7\uD83C\uDDF1',
    'St. Helena' : '\uD83C\uDDF8\uD83C\uDDED',
    'St. Kitts & Nevis' : '\uD83C\uDDF0\uD83C\uDDF3',
    'St. Lucia' : '\uD83C\uDDF1\uD83C\uDDE8',
    'St. Martin' : '\uD83C\uDDF2\uD83C\uDDEB',
    'St. Pierre & Miquelon' : '\uD83C\uDDF5\uD83C\uDDF2',
    'St. Vincent & Grenadines' : '\uD83C\uDDFB\uD83C\uDDE8',
    'Sudan' : '\uD83C\uDDF8\uD83C\uDDE9',
    'Suriname' : '\uD83C\uDDF8\uD83C\uDDF7',
    'Svalbard & Jan Mayen' : '\uD83C\uDDF8\uD83C\uDDEF',
    'Sweden' : '\uD83C\uDDF8\uD83C\uDDEA',
    'Switzerland' : '\uD83C\uDDE8\uD83C\uDDED',
    'Syria' : '\uD83C\uDDF8\uD83C\uDDFE',
    'São Tomé & Príncipe' : '\uD83C\uDDF8\uD83C\uDDF9',
    'Taiwan' : '\uD83C\uDDF9\uD83C\uDDFC',
    'Tajikistan' : '\uD83C\uDDF9\uD83C\uDDEF',
    'Tanzania' : '\uD83C\uDDF9\uD83C\uDDFF',
    'Thailand' : '\uD83C\uDDF9\uD83C\uDDED',
    'The Netherlands' : '\uD83C\uDDF3\uD83C\uDDF1',
    'Timor-Leste' : '\uD83C\uDDF9\uD83C\uDDF1',
    'Togo' : '\uD83C\uDDF9\uD83C\uDDEC',
    'Tokelau' : '\uD83C\uDDF9\uD83C\uDDF0',
    'Tonga' : '\uD83C\uDDF9\uD83C\uDDF4',
    'Trinidad & Tobago' : '\uD83C\uDDF9\uD83C\uDDF9',
    'Tristan da Cunha' : '\uD83C\uDDF9\uD83C\uDDE6',
    'Tunisia' : '\uD83C\uDDF9\uD83C\uDDF3',
    'Turkey' : '\uD83C\uDDF9\uD83C\uDDF7',
    'Turkmenistan' : '\uD83C\uDDF9\uD83C\uDDF2',
    'Turks & Caicos Islands' : '\uD83C\uDDF9\uD83C\uDDE8',
    'Tuvalu' : '\uD83C\uDDF9\uD83C\uDDFB',
    'U.S. Outlying Islands' : '\uD83C\uDDFA\uD83C\uDDF2',
    'U.S. Virgin Islands' : '\uD83C\uDDFB\uD83C\uDDEE',
    'Uganda' : '\uD83C\uDDFA\uD83C\uDDEC',
    'Ukraine' : '\uD83C\uDDFA\uD83C\uDDE6',
    'United Arab Emirates' : '\uD83C\uDDE6\uD83C\uDDEA',
    'United Kingdom' : '\uD83C\uDDEC\uD83C\uDDE7',
    'United Nations' : '\uD83C\uDDFA\uD83C\uDDF3',
    'United States' : '\uD83C\uDDFA\uD83C\uDDF8',
    'Uruguay' : '\uD83C\uDDFA\uD83C\uDDFE',
    'Uzbekistan' : '\uD83C\uDDFA\uD83C\uDDFF',
    'Vanuatu' : '\uD83C\uDDFB\uD83C\uDDFA',
    'Vatican City' : '\uD83C\uDDFB\uD83C\uDDE6',
    'Venezuela' : '\uD83C\uDDFB\uD83C\uDDEA',
    'Vietnam' : '\uD83C\uDDFB\uD83C\uDDF3',
    'Wales' : '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73\uDB40\uDC7F',
    'Wallis & Futuna' : '\uD83C\uDDFC\uD83C\uDDEB',
    'Western Sahara' : '\uD83C\uDDEA\uD83C\uDDED',
    'Yemen' : '\uD83C\uDDFE\uD83C\uDDEA',
    'Zambia' : '\uD83C\uDDFF\uD83C\uDDF2',
    'Zimbabwe' : '\uD83C\uDDFF\uD83C\uDDFC',
    'Åland Islands' : '\uD83C\uDDE6\uD83C\uDDFD',
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
