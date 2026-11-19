'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const themePlugin = require('../plugins/theme');
const { listThemes, setActiveTheme, getActiveThemeName, fmt } = require('../lib/theme');

function context(isOwner, args = []) {
  return {
    socket: { sent: [], async sendMessage(to, message) { this.sent.push(message); } },
    from: '12345678901@s.whatsapp.net',
    msg: { key: { remoteJid: '12345678901@s.whatsapp.net' } },
    args,
    footer: '© Red Dragon DFS',
    isOwner
  };
}

after(() => setActiveTheme('silva'));

test('theme files are available and formatting stays compact', () => {
  assert.deepEqual(listThemes(), ['gold', 'ocean', 'red', 'silva']);
  assert.equal(setActiveTheme('ocean'), true);
  assert.match(fmt('hello'), /RED DRAGON OCEAN/);
  assert.ok(!fmt('hello').includes('━━━━━━━━━━━━━━━━━━'));
});

test('theme command is owner-only and changes the active theme', async () => {
  const denied = context(false, ['gold']);
  await themePlugin.run(denied);
  assert.match(denied.socket.sent[0].text, /Owner only/);

  const owner = context(true, ['gold']);
  await themePlugin.run(owner);
  assert.equal(getActiveThemeName(), 'gold');
  assert.match(owner.socket.sent[0].text, /THEME UPDATED/);
});

