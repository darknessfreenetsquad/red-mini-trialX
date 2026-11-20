'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const games = require('../plugins/games');
const social = require('../plugins/social-downloaders');
const universal = require('../plugins/download');
const omega = require('../plugins/omega');
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
  for (const command of ['play', 'music', 'audius', 'soundcloud', 'jamendo', 'spotify', 'applemusic', 'songsearch', 'findsong', 'trending', 'audiomacktrending', 'ceenaija', 'anime', 'crunchyroll', 'ytdl', 'ytvideo', 'ytaudio', 'kick', 'kickall', 'tgstickers', 'mute', 'open', 'adddescription', 'addstgroup', 'addstchannel', 'converctor', 'converter', 'to-url', 'to-doc', 'to-music', 'to-sticker', 'update', 'statusview', 'download', 'movie', 'movies', 'truth', 'dare', 'rps', 'facebook', 'instagram', 'tiktok', 'twitter', 'imagetheme', 'setimage']) {
    assert.ok(registry.has(command), command);
  }
  for (const command of ['video', 'ytmp3', 'ytmp4', 'ytmpdoc', 'yta', 'ytv', 'play3', 'song2']) {
    assert.equal(registry.has(command), false, `${command} should be removed`);
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
    if (['trending', 'audiomacktrending'].includes(command)) commandContext.skipNetwork = true;
    await registry.get(command).run(commandContext);
    assert.ok(commandContext.socket.sent.length > 0, `${command} produced no response`);
  }
});

test('social and universal downloader plugins validate URLs and send API media', async () => {
  axios.get = async url => url.includes('/api/download/facebook')
    ? { data: { success: true, data: { directUrl: 'https://cdn.test/social.mp4' } } }
    : url.includes('omegatech')
    ? { data: { success: true, result: { video: [{ url: 'https://cdn.test/all.mp4' }] } } }
    : { data: { result: { hd: 'https://cdn.test/social.mp4' } } };
  const socialCtx = ctx('facebook', ['https://facebook.com/test']); await social.run(socialCtx);
  assert.equal(socialCtx.socket.sent.at(-1).video.url, 'https://cdn.test/social.mp4');
  assert.match(socialCtx.socket.sent.at(-1).caption, /𝙍𝙀𝘿 𝙓𝙈𝘿/);
  const universalCtx = ctx('download', ['https://example.com/test']); await universal.run(universalCtx);
  assert.equal(universalCtx.socket.sent.at(-1).video.url, 'https://cdn.test/all.mp4');
});

test('Facebook downloader maps Omegatech data.directUrl responses', async () => {
  axios.get = async (url, options) => {
    assert.match(url, /api\.omegatech\.app\/api\/download\/facebook/);
    assert.deepEqual(options.params, { action: 'download', url: 'https://facebook.com/new-format' });
    assert.equal(options.timeout, 15000);
    return { data: { success: true, data: { videoId: '123', quality: 'hd', directUrl: 'https://cdn.test/omegatech.mp4' } } };
  };
  const socialCtx = ctx('facebook', ['https://facebook.com/new-format']);
  await social.run(socialCtx);
  assert.equal(socialCtx.socket.sent.at(-1).video.url, 'https://cdn.test/omegatech.mp4');
});

test('Omegatech commands map search, trending, anime, and YouTube metadata safely', async () => {
  axios.get = async (url, options) => {
    assert.equal(options.timeout, 15000);
    if (url.includes('searchthatsong')) return { data: { success: true, data: { song: 'Unethical', artist: 'Faouzia', relevantChunk: 'Isn\'t it a bit unethical?', youtubeUrl: 'https://youtube.com/watch?v=test' } } };
    if (url.includes('audiomack')) return { data: { success: true, data: { count: 1, items: [{ title: 'Somebody', artist: 'Trei', pageUrl: 'https://audiomack.com/trei/song/somebody' }] } } };
    if (url.includes('Crunchyroll')) return { data: { success: true, data: { query: 'Naruto', results: [{ title: 'Naruto', type: 'series', crId: 'GY9PJ5KWR', description: 'Ninja series' }] } } };
    if (url.includes('/download/YouTube')) return { data: { success: true, data: { title: 'Test video', channel: 'Test channel', durationLabel: '1:00', url: 'https://youtu.be/test', videoFormats: [{ label: '360p', sizeBytes: 1000000, sizeLabel: '1 MB', downloadUrl: 'https://cdn.test/test.mp4' }] } } };
    throw new Error(`Unexpected URL: ${url}`);
  };

  const song = ctx('songsearch', ['It', 'unethical']); await omega.run(song);
  assert.match(song.socket.sent.at(-1).text, /Faouzia/);
  const trend = ctx('trending'); await omega.run(trend);
  assert.match(trend.socket.sent.at(-1).text, /Somebody/);
  const anime = ctx('anime', ['Naruto']); await omega.run(anime);
  assert.match(anime.socket.sent.at(-1).text, /GY9PJ5KWR/);
  const youtube = ctx('ytdl', ['https://youtu.be/test']); await omega.run(youtube);
  assert.match(youtube.socket.sent.at(-1).text, /Test video/);
});

test('Omegatech play searches YouTube Music and sends the returned audio stream', async () => {
  const calls = [];
  axios.get = async (url, options) => {
    calls.push({ url, options });
    assert.match(url, /api\.omegatech\.app\/api\/download\/play/);
    assert.equal(options.timeout, 15000);
    if (options.params.action === 'search') {
      return { data: { success: true, data: { query: 'Alan Walker', songs: [{ videoId: 'music-123', title: 'Test Song', artist: 'Test Artist', url: 'https://music.youtube.com/watch?v=music-123' }] } } };
    }
    assert.equal(options.params.action, 'play');
    assert.equal(options.params.videoId, 'music-123');
    return { data: { success: true, data: { videoId: 'music-123', title: 'Test Song', artist: 'Test Artist', streams: [{ format: 'mp3', url: 'https://cdn.test/test-song.mp3' }] } } };
  };

  const play = ctx('play', ['Alan', 'Walker']);
  await omega.run(play);
  const message = play.socket.sent.at(-1);
  assert.equal(message.audio.url, 'https://cdn.test/test-song.mp3');
  assert.equal(message.mimetype, 'audio/mpeg');
  assert.match(message.caption, /Test Song/);
  assert.deepEqual(calls.map(call => call.options.params.action), ['search', 'play']);
});

test('Omegatech play falls back to the existing YouTube audio endpoint when conversion is unavailable', async () => {
  const calls = [];
  axios.get = async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.timeout, 15000);
    if (url.endsWith('/download/play') && options.params.action === 'play') {
      return { data: { success: true, data: { title: 'Fallback Song', streams: [] } } };
    }
    if (url.endsWith('/download/play') && options.params.action === 'download') {
      return { data: { success: false, error: 'audio_conversion_failed_for_all_formats' } };
    }
    assert.match(url, /\/download\/YouTube$/);
    assert.equal(options.params.type, 'audio');
    assert.match(options.params.url, /youtube\.com\/watch\?v=music-456/);
    return { data: { success: true, data: { title: 'Fallback Song', audio: { mp3: { downloadUrl: 'https://cdn.test/fallback.mp3' } } } } };
  };

  const result = await omega.playSong('music-456');
  assert.equal(result.audioUrl, 'https://cdn.test/fallback.mp3');
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/download/play', '/api/download/play', '/api/download/YouTube']);
});

test('Omegatech YouTube video command enforces the 50 MB limit', async () => {
  axios.get = async () => ({ data: { success: true, data: { title: 'Large video', channel: 'Test', durationLabel: '1:00', videoFormats: [{ label: '1080p', sizeBytes: 100000000, sizeLabel: '100 MB', downloadUrl: 'https://cdn.test/large.mp4' }] } } });
  const video = ctx('ytvideo', ['https://youtu.be/large']); await omega.run(video);
  assert.match(video.socket.sent.at(-1).text, /50 MB/);
  assert.equal(video.socket.sent.at(-1).video, undefined);
});
