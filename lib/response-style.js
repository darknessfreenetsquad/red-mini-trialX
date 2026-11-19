'use strict';

function redDragon(title, lines = [], footer = '') {
  const content = [
    '🔴 RED DRAGON DFS',
    `• ${title}`,
    ...lines.filter(Boolean).map(line => `• ${line}`),
    footer
  ].filter(Boolean);
  return content.join('\n');
}

function cleanFileName(value, fallback = 'red-dragon-file') {
  return (value || fallback).replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 80);
}

module.exports = { redDragon, cleanFileName };
