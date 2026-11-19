'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

const THEMES_DIR = path.join(__dirname, '..', 'themes');
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');
const BAR = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

function listThemes() {
  if (!fs.existsSync(THEMES_DIR)) return [];
  return fs.readdirSync(THEMES_DIR).filter(file => file.endsWith('.json')).map(file => file.replace(/\.json$/i, '').toLowerCase()).sort();
}

function loadTheme(name) {
  const key = (name || 'silva').toLowerCase().trim();
  if (!/^[a-z0-9_-]+$/.test(key)) return null;
  const file = path.join(THEMES_DIR, `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return raw && raw.STRINGS ? raw.STRINGS : null;
  } catch (_) {
    return null;
  }
}

function getActiveTheme() {
  if (global._activeThemeStrings) return global._activeThemeStrings;
  global._activeThemeStrings = loadTheme(config.THEME) || loadTheme('silva') || { global: {} };
  return global._activeThemeStrings;
}

function getActiveThemeName() {
  return config.THEME || 'silva';
}

function setActiveTheme(name) {
  const key = (name || '').toLowerCase().trim();
  const strings = loadTheme(key);
  if (!strings) return false;
  config.THEME = key;
  global._activeThemeStrings = strings;
  return true;
}

function getStr(key) {
  return getActiveTheme()?.global?.[key] || null;
}

function getPluginCount() {
  if (!fs.existsSync(PLUGINS_DIR)) return 0;
  return fs.readdirSync(PLUGINS_DIR).filter(file => file.endsWith('.js')).length;
}

function getSouthAfricanTime() {
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date());
}

function getHeader(prefix = config.PREFIX || '.') {
  const name = getStr('headerName') || '𝙍𝙀𝘿 𝙓𝙈𝘿';
  return [
    `╭─ׁ━❍─↻${name}↺─❍━╮`,
    `┃  ⌬ ${getSouthAfricanTime()}`,
    `┃  ⌬ ${getPluginCount()} plugins loaded`,
    `┃  ⌬ Prefix: \`${prefix}\``,
    `┃  ⌬ THEME: ${getActiveThemeName()}`,
    `╰${BAR}╯`
  ];
}

function getFooter(prefix = config.PREFIX || '.') {
  const footer = getStr('footer') || '© ʀᴇᴅ ᴅʀᴀɢᴏɴ ᴅғs';
  return [
    `╭${BAR}╮`,
    `┃  💡 \`${prefix}help <cmd>\``,
    `┃  ${footer}`,
    `╰${BAR}╯`,
    `╰─ׁ━❍─↻${getStr('headerName') || '𝙍𝙀𝘿 𝙓𝙈𝘿'}↺─❍━╯`
  ];
}

function fmt(body, prefix = config.PREFIX || '.') {
  const lines = String(body || '').trim().split('\n');
  const content = lines.map(line => line ? `┃  ⌬ ${line}` : '┃');
  return [...getHeader(prefix), ...content, ...getFooter(prefix)].join('\n');
}

function redDragon(title, lines = [], fallbackFooter = '') {
  const body = [`*${title}*`, ...lines.filter(Boolean)];
  const formatted = fmt(body.join('\n'));
  return formatted || fallbackFooter;
}

function isThemedText(value) {
  return typeof value === 'string' && value.includes(getStr('headerName') || '𝙍𝙀𝘿 𝙓𝙈𝘿');
}

module.exports = {
  THEMES_DIR,
  listThemes,
  loadTheme,
  getActiveTheme,
  getActiveThemeName,
  setActiveTheme,
  getStr,
  getPluginCount,
  getSouthAfricanTime,
  getHeader,
  getFooter,
  fmt,
  redDragon,
  isThemedText
};
