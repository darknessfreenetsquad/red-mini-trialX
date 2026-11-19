'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const plugin = require('../plugins/youtube');

const originalGet = axios.get;
after(() => { axios.get = originalGet; delete process.env.YOUTUBE_API_KEY; });

const context = command => ({
  socket: { sent: [], async sendMessage(to, message, options) { this.sent.push({ to, message, options }); } },
  from: '12345678901@s.whatsapp.net',
  msg: { key: { remoteJid: '12345678901@s.whatsapp.net' } },
  command,
  args: command === 'video' ? ['test', 'video'] : ['test', 'song'],
  prefix: '.',
  footer: 'footer'
});

test('official YouTube search requires a server key and maps a video result', async () => {
  delete process.env.YOUTUBE_API_KEY;
  await assert.rejects(plugin.searchYouTube('test'), /YOUTUBE_API_KEY/);
  process.env.YOUTUBE_API_KEY = 'server-only-test-key';
  let request;
  axios.get = async (url, options) => {
    request = { url, options };
    return { data: { items: [{ id: { videoId: 'abc123' }, snippet: { title: 'Test Song', channelTitle: 'Channel', thumbnails: { default: { url: 'https://img.test/thumb.jpg' } } } }] } };
  };
  assert.deepEqual(await plugin.searchYouTube('test song'), {
    id: 'abc123', url: 'https://www.youtube.com/watch?v=abc123', title: 'Test Song', channel: 'Channel', thumbnail: 'https://img.test/thumb.jpg'
  });
  assert.equal(request.url, 'https://www.googleapis.com/youtube/v3/search');
  assert.equal(request.options.params.key, 'server-only-test-key');
});

test('.play offers audio and document buttons, and both button actions work', async () => {
  process.env.YOUTUBE_API_KEY = 'test-key';
  axios.get = async (url, options) => {
    if (url.includes('googleapis')) return { data: { items: [{ id: { videoId: 'abc123' }, snippet: { title: 'Test Song', channelTitle: 'Channel', thumbnails: {} } }] } };
    return { data: { result: { downloadUrl: 'https://cdn.test/audio.mp3' } } };
  };
  const search = context('play');
  await plugin.run(search);
  const buttonMessage = search.socket.sent[1].message;
  assert.equal(buttonMessage.buttons.length, 2);
  assert.match(buttonMessage.buttons[0].buttonId, /^\.playaudio /);
  assert.match(buttonMessage.buttons[1].buttonId, /^\.playdoc /);

  const audio = context('playaudio'); audio.args = [buttonMessage.buttons[0].buttonId.split(' ')[1]];
  await plugin.run(audio);
  assert.equal(audio.socket.sent.at(-1).message.audio.url, 'https://cdn.test/audio.mp3');

  const document = context('playdoc'); document.args = [buttonMessage.buttons[1].buttonId.split(' ')[1]];
  await plugin.run(document);
  assert.equal(document.socket.sent.at(-1).message.document.url, 'https://cdn.test/audio.mp3');
});

test('.video searches the official API and sends a video response', async () => {
  process.env.YOUTUBE_API_KEY = 'test-key';
  axios.get = async url => url.includes('googleapis')
    ? { data: { items: [{ id: { videoId: 'video123' }, snippet: { title: 'Test Video', channelTitle: 'Channel', thumbnails: {} } }] } }
    : { data: { result: { downloadUrl: 'https://cdn.test/video.mp4' } } };
  const ctx = context('video');
  await plugin.run(ctx);
  const message = ctx.socket.sent.at(-1).message;
  assert.equal(message.video.url, 'https://cdn.test/video.mp4');
  assert.equal(message.mimetype, 'video/mp4');
});
