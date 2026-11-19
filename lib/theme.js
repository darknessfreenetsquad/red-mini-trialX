'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

const THEMES_DIR = path.join(__dirname, '..', 'themes');

function listThemes() {
  if (!fs.existsSync(THEMES_DIR)) return [];
  return fs.readdirSync(THEMES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace(/\.json$/i, '').toLowerCase())
    .sort();
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
  const strings = loadTheme(config.THEME) || loadTheme('silva') || { global: {} };
  global._activeThemeStrings = strings;
  return strings;
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

function fmt(body) {
  const name = getStr('botName') || '🔴 RED DRAGON DFS';
  const footer = getStr('footer') || '';
  return [`*${name}*`, '', String(body || '').trim(), footer ? `_${footer}_` : '']
    .filter(Boolean)
    .join('\n');
}

function redDragon(title, lines = [], fallbackFooter = '') {
  const body = [`• ${title}`, ...lines.filter(Boolean).map(line => `• ${line}`)].join('\n');
  const themed = fmt(body);
  return themed || fallbackFooter;
}

function isThemedText(value) {
  const name = getStr('botName');
  return typeof value === 'string' && Boolean(name) && value.includes(name);
}

module.exports = {
  THEMES_DIR,
  listThemes,
  loadTheme,
  getActiveTheme,
  getActiveThemeName,
  setActiveTheme,
  getStr,
  fmt,
  redDragon,
  isThemedText
};
