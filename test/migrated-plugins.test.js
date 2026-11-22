'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const games = require('../plugins/games');
const social = require('../plugins/social-downloaders');
const universal = require('../plugins/download');
const omega = require('../plugins/omega');
const omegamus = require('../plugins/omegamus');
const configuredApi = require('../lib/configured-api');
const ytdl = require('../lib/ytdl');
const apiHandlers = require('../lib/api');
const config = require('../config');
const xcasperMusic = require('../lib/xcasper-music');
const { loadPlugins } = require('../plugin-loader');

const originalGet = axios.get;
const originalSearchYouTube = omega.searchYouTube;
const originalSearchYouTubeMusic = omega.searchYouTubeMusic;
const originalDownloadPlayAudio = omega.downloadPlayAudio;
after(() => {
  axios.get = originalGet;
  omega.searchYouTube = originalSearchYouTube;
  omega.searchYouTubeMusic = originalSearchYouTubeMusic;
  omega.downloadPlayAudio = originalDownloadPlayAudio;
});

function ctx(command, args = []) {
  return {
    socket: { sent: [], async sendMessage(to, message) { this.sent.push(message); } },
    from: '12345678901@s.whatsapp.net', msg: { key: { remoteJid: '12345678901@s.whatsapp.net' } },
    command, args, prefix: '.', footer: '© Red Dragon DFS', botName: 'Red Mini', ownerNumber: 'Not configured', getUptime: () => 12
  };
}

test('plugin loader exposes migrated non-menu commands', () => {
  const registry = loadPlugins();
  for (const command of ['play', 'song', 'music', 'audius', 'soundcloud', 'jamendo', 'spotify', 'applemusic', 'omegamus', 'omegasearch', 'songsearch', 'findsong', 'trending', 'audiomacktrending', 'ceenaija', 'anime', 'crunchyroll', 'video', 'ytdl', 'ytvideo', 'ytaudio', 'kick', 'kickall', 'tgstickers', 'mute', 'open', 'adddescription', 'addstgroup', 'addstchannel', 'converctor', 'converter', 'to-url', 'to-doc', 'to-music', 'to-sticker', 'update', 'statusview', 'download', 'movie', 'movies', 'truth', 'dare', 'rps', 'facebook', 'instagram', 'tiktok', 'twitter', 'imagetheme', 'setimage']) {
    assert.ok(registry.has(command), command);
  }
  for (const command of ['ytmp3', 'ytmp4', 'ytmpdoc', 'yta', 'ytv', 'play3', 'song2']) {
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

test('TikTok downloader uses TikWM and extracts its hdplay URL', async () => {
  axios.get = async (url, options) => {
    assert.equal(url, 'https://www.tikwm.com/api/');
    assert.deepEqual(options.params, { url: 'https://www.tiktok.com/@user/video/123', hd: 1 });
    return { data: { code: 0, data: { title: 'Test TikTok', hdplay: 'https://cdn.test/tiktok.mp4' } } };
  };
  const tikTokCtx = ctx('tiktok', ['https://www.tiktok.com/@user/video/123']);
  await social.run(tikTokCtx);
  assert.equal(tikTokCtx.socket.sent.at(-1).video.url, 'https://cdn.test/tiktok.mp4');
});

test('configured API fallback uses config.js base URLs and keys', async () => {
  const previousOrder = process.env.CONFIG_API_ORDER;
  process.env.CONFIG_API_ORDER = 'xteam';
  axios.get = async (url, options) => {
    if (url.includes('api.xteam.xyz')) {
      assert.equal(options.params.apikey, config.APIKeys.xteam || undefined);
      return { status: 200, data: { data: { downloadUrl: 'https://cdn.test/configured.mp3' } } };
    }
    return { status: 404, data: {} };
  };
  try {
    const fallback = await configuredApi.youtubeAudio('https://youtu.be/configured');
    assert.equal(fallback.provider, 'xteam');
    assert.equal(fallback.url, 'https://cdn.test/configured.mp3');
  } finally {
    if (previousOrder === undefined) delete process.env.CONFIG_API_ORDER;
    else process.env.CONFIG_API_ORDER = previousOrder;
  }
});

test('lib/ytdl audio handlers resolve a playable fallback for play', async () => {
  const originalKnight = apiHandlers.knightSongDownload;
  apiHandlers.knightSongDownload = async url => ({ title: 'Configured Handler Song', download: `https://cdn.test/${url.includes('youtu') ? 'handler' : 'wrong'}.mp3` });
  try {
    const result = await ytdl.getAudio('https://youtu.be/handler', false);
    assert.equal(result.title, 'Configured Handler Song');
    assert.equal(result.download, 'https://cdn.test/handler.mp3');
  } finally {
    apiHandlers.knightSongDownload = originalKnight;
  }
});

test('direct YouTube video URLs resolve without an extra search request', async () => {
  axios.get = async () => { throw new Error('search should not be called for a direct URL'); };
  const video = await ytdl.resolveVideo('https://youtu.be/abcdefghijk');
  assert.equal(video.videoId, 'abcdefghijk');
  assert.equal(video.url, 'https://www.youtube.com/watch?v=abcdefghijk');
});

test('X CASPER search normalizes the API result and builds a safe download URL', async () => {
  let request;
  axios.get = async (url, options) => {
    request = { url, options };
    return { data: { success: true, topResult: { type: 'song', videoId: '60ItHLz5WEA', title: 'Faded', artists: [{ name: 'Alan Walker' }] } } };
  };
  const track = await xcasperMusic.search('faded alan walker');
  assert.equal(request.url, 'https://ytm.xcasper.space/api/search');
  assert.deepEqual(request.options.params, { q: 'faded alan walker' });
  assert.equal(track.artist, 'Alan Walker');
  assert.equal(track.downloadUrl, 'https://ytm.xcasper.space/api/download/60ItHLz5WEA');
  assert.throws(() => xcasperMusic.downloadUrl('not-an-id'), /Invalid YouTube Music track ID/);
});

test('Omegatech music search maps songs and topResult responses', async () => {
  axios.get = async () => ({
    status: 200,
    data: {
      success: true,
      data: {
        songs: [{ videoId: 'song-1', title: 'First Song', artist: 'Artist', url: 'https://youtu.be/song-1' }],
        topResult: { videoId: 'top-1', title: 'Top Song', subtitles: ['Song', 'Top Artist', '3:20'], url: 'https://youtu.be/top-1' }
      }
    }
  });
  const songs = await omegamus.searchOmegatechMusic('Top Song');
  assert.equal(songs.length, 2);
  assert.equal(songs[0].title, 'Top Song');
  const result = ctx('omegamus', ['Top', 'Song']);
  await omegamus.run(result);
  assert.match(result.socket.sent.at(-1).text, /Top Song/);
  assert.match(result.socket.sent.at(-1).text, /First Song/);
});

test('Omegatech commands map search, trending, anime, and YouTube video downloads', async () => {
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
  assert.equal(youtube.socket.sent.at(-1).video.url, 'https://cdn.test/test.mp4');
  assert.match(youtube.socket.sent.at(-1).caption, /Test video/);
  const videoAlias = ctx('video', ['https://youtu.be/test']); await omega.run(videoAlias);
  assert.equal(videoAlias.socket.sent.at(-1).video.url, 'https://cdn.test/test.mp4');
});

test('play reports missing queries and empty YouTube results in Red Dragon text', async () => {
  const missing = ctx('play');
  await omega.run(missing);
  assert.match(missing.socket.sent.at(-1).text, /What song do you want to download/);

  omega.searchYouTubeMusic = async () => null;
  omega.searchYouTube = async () => ({ videos: [] });
  const empty = ctx('play', ['unknown song']);
  await omega.run(empty);
  assert.match(empty.socket.sent.at(-1).text, /No songs found/);
  assert.match(empty.socket.sent.at(-1).text, /𝙍𝙀𝘿 𝙓𝙈𝘿/);
});

test('play searches YouTube, calls Keith MP3, and sanitizes the returned filename', async () => {
  const calls = [];
  omega.searchYouTubeMusic = async () => null;
  omega.searchYouTube = async query => {
    assert.equal(query, 'Alan Walker');
    return { videos: [{ title: 'Search result', url: 'https://www.youtube.com/watch?v=music-123' }] };
  };
  omega.downloadPlayAudio = async url => {
    calls.push(url);
    return { title: 'Song: Test/Unsafe?', downloadUrl: 'https://cdn.test/test-song.mp3' };
  };

  const play = ctx('play', ['Alan', 'Walker']);
  await omega.run(play);
  const message = play.socket.sent.at(-1);
  assert.equal(message.audio.url, 'https://cdn.test/test-song.mp3');
  assert.equal(message.mimetype, 'audio/mpeg');
  assert.equal(message.fileName, 'Song_ Test_Unsafe_.mp3');
  assert.deepEqual(calls, ['https://www.youtube.com/watch?v=music-123']);
});

test('play and song send X CASPER YouTube Music audio directly', async () => {
  omega.searchYouTubeMusic = async query => ({
    id: 'abcdefghijk', title: `${query} Song`, artist: 'Test Artist',
    downloadUrl: 'https://ytm.xcasper.space/api/download/abcdefghijk'
  });
  const song = ctx('song', ['Test']);
  await omega.run(song);
  assert.equal(song.socket.sent.at(-1).audio.url, 'https://ytm.xcasper.space/api/download/abcdefghijk');
  assert.equal(song.socket.sent.at(-1).fileName, 'Test Song.mp3');
});

test('play reports invalid Keith responses and download failures', async () => {
  omega.searchYouTubeMusic = async () => null;
  omega.searchYouTube = async () => ({ videos: [{ url: 'https://youtu.be/music-789' }] });
  omega.downloadPlayAudio = async () => {
    throw new Error('Failed to fetch audio from the API. Please try again later.');
  };
  const invalid = ctx('play', ['invalid']);
  await omega.run(invalid);
  assert.match(invalid.socket.sent.at(-1).text, /Failed to fetch audio from the API/);

  omega.downloadPlayAudio = async () => { throw new Error('timeout'); };
  const failed = ctx('play', ['timeout']);
  await omega.run(failed);
  assert.match(failed.socket.sent.at(-1).text, /Download failed/);
});

test('Omegatech YouTube video command enforces the 50 MB limit', async () => {
  axios.get = async () => ({ data: { success: true, data: { title: 'Large video', channel: 'Test', durationLabel: '1:00', videoFormats: [{ label: '1080p', sizeBytes: 100000000, sizeLabel: '100 MB', downloadUrl: 'https://cdn.test/large.mp4' }] } } });
  const video = ctx('ytvideo', ['https://youtu.be/large']); await omega.run(video);
  assert.match(video.socket.sent.at(-1).text, /50 MB/);
  assert.equal(video.socket.sent.at(-1).video, undefined);
});

test('YouTube video selection accepts alternate URL and size fields', () => {
  const selected = omega.chooseVideo([{ label: '360p', height: 360, sizeLabel: '26.8 MB', url: 'https://cdn.test/video.mp4' }]);
  assert.equal(selected.downloadUrl, 'https://cdn.test/video.mp4');
  assert.equal(selected.sizeBytes, 26.8 * 1024 * 1024);
});
