'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const plugin = require('../plugins/music');

const originalGet = axios.get;
after(() => { axios.get = originalGet; });

function context(command = 'music', args = ['test', 'song']) {
  return {
    socket: { sent: [], async sendMessage(to, message, options) { this.sent.push({ to, message, options }); } },
    from: '12345678901@s.whatsapp.net',
    msg: { key: { remoteJid: '12345678901@s.whatsapp.net' } },
    command,
    args,
    prefix: '.',
    footer: 'footer'
  };
}

test('Audius search uses the public track-search endpoint and maps a result', async () => {
  let request;
  axios.get = async (url, options) => {
    request = { url, options };
    return { data: { data: [{ id: 'track-123', title: 'Test Song', user: { name: 'Test Artist' }, duration: 187, permalink: 'https://audius.co/test-artist/test-song', artwork: { '150x150': 'https://cdn.test/art.jpg' }, is_downloadable: false }] } };
  };
  const result = await plugin.searchAudius('test song');
  assert.equal(request.url, 'https://api.audius.co/v1/tracks/search');
  assert.deepEqual(request.options.params, { query: 'test song', limit: 1 });
  assert.deepEqual(result, {
    id: 'track-123',
    title: 'Test Song',
    artist: 'Test Artist',
    duration: 187,
    url: 'https://audius.co/test-artist/test-song',
    streamUrl: 'https://api.audius.co/v1/tracks/track-123/stream',
    artwork: 'https://cdn.test/art.jpg',
    downloadable: false
  });
});

test('.music searches Audius and sends an audio stream with source attribution', async () => {
  axios.get = async () => ({ data: { data: [{ id: 'track-123', title: 'Test Song', user: { name: 'Test Artist' }, duration: 187, permalink: '/test-artist/test-song' }] } });
  const ctx = context('music');
  await plugin.run(ctx);
  const message = ctx.socket.sent.at(-1).message;
  assert.equal(message.audio.url, 'https://api.audius.co/v1/tracks/track-123/stream');
  assert.equal(message.mimetype, 'audio/mpeg');
  assert.match(message.caption, /AUDIUS MUSIC/);
  assert.match(message.caption, /https:\/\/audius\.co\/test-artist\/test-song/);
});

test('.audius is the only music alias and old YouTube aliases are not registered', () => {
  assert.deepEqual(plugin.commands, ['music', 'audius']);
  for (const alias of ['play', 'video', 'yta', 'ytv', 'ytmp3', 'ytmp4', 'play3', 'song2']) {
    assert.equal(plugin.commands.includes(alias), false, alias);
  }
});
