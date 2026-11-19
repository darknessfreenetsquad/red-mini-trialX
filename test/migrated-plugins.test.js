'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const games = require('../plugins/games');
const social = require('../plugins/social-downloaders');
const universal = require('../plugins/download');
const { loadPlugins } = require('../plugin-loader');

const originalGet = axios.get;
after(() => { axios.get = originalGet; });

function ctx(command, args = []) {
  return {
    socket: { sent: [], async sendMessage(to, message) { this.sent.push(message); } },
    from: '12345678901@s.whatsapp.net', msg: { key: { remoteJid: '12345678901@s.whatsapp.net' } },
    command, args, prefix: '.', footer: '© Red Dragon DFS', botName: 'Red Mini', ownerNumber: 'Not configured', getUptime: () => 12
  };
}

test('plugin loader exposes migrated non-menu commands', () => {
  const registry = loadPlugins();
  for (const command of ['play', 'video', 'ytmp3', 'ytmp4', 'ytmpdoc', 'yta', 'ytv', 'play3', 'song2', 'download', 'truth', 'dare', 'rps', 'facebook', 'instagram', 'tiktok', 'twitter', 'theme', 'settheme']) {
    assert.ok(registry.has(command), command);
  }
  assert.ok(registry.has('menu'), 'existing menu plugin remains available');
});

test('games use compact RedDragon formatting and validate rps', async () => {
  const truth = ctx('truth'); await games.run(truth);
  assert.match(truth.socket.sent[0].text, /𝙍𝙀𝘿 𝙓𝙈𝘿/);
  const rps = ctx('rps', ['invalid']); await games.run(rps);
  assert.match(rps.socket.sent[0].text, /Choose: rock/);
});

test('every registered plugin command alias has a safe local smoke path', async () => {
  const registry = loadPlugins();
  for (const command of registry.keys()) {
    const commandContext = ctx(command);
    await registry.get(command).run(commandContext);
    assert.ok(commandContext.socket.sent.length > 0, `${command} produced no response`);
  }
});

test('social and universal downloader plugins validate URLs and send API media', async () => {
  axios.get = async url => url.includes('omegatech')
    ? { data: { success: true, result: { video: [{ url: 'https://cdn.test/all.mp4' }] } } }
    : { data: { result: { hd: 'https://cdn.test/social.mp4' } } };
  const socialCtx = ctx('facebook', ['https://facebook.com/test']); await social.run(socialCtx);
  assert.equal(socialCtx.socket.sent.at(-1).video.url, 'https://cdn.test/social.mp4');
  assert.match(socialCtx.socket.sent.at(-1).caption, /𝙍𝙀𝘿 𝙓𝙈𝘿/);
  const universalCtx = ctx('download', ['https://example.com/test']); await universal.run(universalCtx);
  assert.equal(universalCtx.socket.sent.at(-1).video.url, 'https://cdn.test/all.mp4');
});
