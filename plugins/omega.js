'use strict';

const yts = require('yt-search');
const axios = require('axios');
const { redDragon, cleanFileName } = require('../lib/response-style');

const OMEGA_BASE = process.env.OMEGATECH_API_BASE || 'https://api.omegatech.app/api';
const REQUEST_TIMEOUT = 15000;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function clean(value, fallback = 'Unknown') {
  return String(value ?? fallback).replace(/[\r\n]+/g, ' ').trim();
}

function requireText(args, usage) {
  const text = args.join(' ').trim();
  if (!text) throw new Error(`Usage: ${usage}`);
  return text.slice(0, 300);
}

function ensureSuccess(payload) {
  if (!payload?.success) {
    const error = payload?.error || payload?.message || 'Omegatech request failed.';
    throw new Error(clean(error, 'Omegatech request failed.'));
  }
  return payload.data || {};
}

async function get(path, params) {
  const { data } = await axios.get(`${OMEGA_BASE}${path}`, { timeout: REQUEST_TIMEOUT, params });
  return ensureSuccess(data);
}

function linesForSongSearch(data) {
  const song = data.song || 'Unknown';
  const artist = data.artist || 'Unknown';
  const lines = [
    `Song: ${clean(song)}`,
    `Artist: ${clean(artist)}`,
    data.album ? `Album: ${clean(data.album)}` : '',
    data.year && data.year !== 'n/a' ? `Year: ${clean(data.year)}` : '',
    data.relevantChunk ? `Match: “${clean(data.relevantChunk).slice(0, 160)}”` : '',
    data.previewUrl ? `Preview: ${data.previewUrl}` : '',
    data.youtubeUrl ? `YouTube: ${data.youtubeUrl}` : '',
    data.webSources?.[0]?.url ? `Lyrics source: ${data.webSources[0].url}` : ''
  ];
  return lines.filter(Boolean);
}

function formatTrending(data) {
  const items = Array.isArray(data.items) ? data.items.slice(0, 10) : [];
  if (!items.length) return ['No trending songs were returned.'];
  return [
    `Showing ${items.length} of ${data.count || items.length} songs:`,
    ...items.map((item, index) => {
      const explicit = item.explicit ? ' [Explicit]' : '';
      return `${index + 1}. ${clean(item.title || item.song)} — ${clean(item.artist)}${explicit}\n   ${item.pageUrl || ''}`;
    })
  ];
}

function formatCeenaija(data) {
  const items = Array.isArray(data.items) ? data.items.slice(0, 10) : [];
  if (!items.length) return ['No Ceenaija results were returned.'];
  return [
    `Results for: ${clean(data.q)}`,
    ...items.map((item, index) => `${index + 1}. ${clean(item.fullTitle || `${item.song} — ${item.artist}`)}\n   ${item.link || ''}${item.youtubeUrl ? `\n   YouTube: ${item.youtubeUrl}` : ''}`)
  ];
}

function formatAnime(data) {
  const items = Array.isArray(data.results) ? data.results.slice(0, 10) : [];
  if (!items.length) return ['No anime results were returned.'];
  return [
    `Results for: ${clean(data.query)}`,
    ...items.map((item, index) => `${index + 1}. ${clean(item.title)} (${clean(item.type)})\n   Crunchyroll ID: ${clean(item.crId)}\n   ${clean(item.description, 'No description available.').slice(0, 180)}`)
  ];
}

function bytesLabel(bytes) {
  if (!Number.isFinite(bytes)) return 'unknown size';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function chooseVideo(formats) {
  return formats
    .filter(format => format?.downloadUrl && Number.isFinite(format.sizeBytes) && format.sizeBytes <= MAX_VIDEO_BYTES)
    .sort((a, b) => Number(b.height || 0) - Number(a.height || 0))[0] || null;
}

function youtubeLines(data) {
  const lines = [
    `Title: ${clean(data.title)}`,
    `Channel: ${clean(data.channel)}`,
    `Duration: ${clean(data.durationLabel)}`,
    `Source: ${data.url || ''}`,
    '',
    'Available formats:'
  ];
  for (const format of (data.videoFormats || []).slice(0, 6)) {
    lines.push(`${format.label || format.quality}: ${format.sizeLabel || bytesLabel(format.sizeBytes)}${format.downloadUrl ? '' : ' (unavailable)'}`);
  }
  if (data.audio?.mp3?.downloadUrl) lines.push(`Audio MP3: ${data.audio.mp3.bitrateKbps || 128} kbps`);
  lines.push('', 'Signed download URLs expire quickly; they are not stored by the bot.');
  return lines;
}

async function searchSong(query) {
  return get('/Search/searchthatsong', { action: 'search', query });
}

async function searchYouTube(query) {
  return yts(query);
}

async function downloadPlayAudio(url) {
  const { data } = await axios.get('https://apis-keith.vercel.app/download/dlmp3', {
    timeout: REQUEST_TIMEOUT,
    params: { url }
  });
  if (!data?.status || !data?.result || !data.result.downloadUrl) {
    throw new Error('Failed to fetch audio from the API. Please try again later.');
  }
  return data.result;
}

async function trendingSongs() {
  return get('/download/audiomack', { action: 'trending', show: 'songs' });
}

async function searchCeenaija(query) {
  return get('/download/ceenaija', { action: 'search', q: query });
}

async function searchAnime(query) {
  return get('/Anime/Crunchyroll', { action: 'search', q: query });
}

async function youtubeDownload(url, type = 'video') {
  return get('/download/YouTube', { action: 'download', url, type, bitrate: 128 });
}

module.exports = {
  commands: ['play', 'songsearch', 'findsong', 'trending', 'audiomacktrending', 'ceenaija', 'anime', 'crunchyroll', 'ytdl', 'ytvideo', 'ytaudio'],
  searchSong,
  searchYouTube,
  downloadPlayAudio,
  trendingSongs,
  searchCeenaija,
  searchAnime,
  youtubeDownload,
  chooseVideo,
  async run(ctx) {
    const { socket, from, msg, command, args, footer } = ctx;
    if (ctx.skipNetwork) {
      await socket.sendMessage(from, { text: redDragon('OMEGATECH', [`Usage path verified for .${command}.`], footer) }, { quoted: msg });
      return;
    }
    try {
      if (command === 'play') {
        const query = args.join(' ').trim().slice(0, 300);
        if (!query) {
          await socket.sendMessage(from, { text: redDragon('PLAY', ['What song do you want to download?'], footer) }, { quoted: msg });
          return;
        }

        let search;
        try {
          search = await module.exports.searchYouTube(query);
        } catch (error) {
          await socket.sendMessage(from, { text: redDragon('PLAY ERROR', ['YouTube search failed. Please try again later.'], footer) }, { quoted: msg });
          return;
        }

        const video = Array.isArray(search?.videos) ? search.videos[0] : null;
        if (!video?.url) {
          await socket.sendMessage(from, { text: redDragon('PLAY SEARCH', ['No songs found!'], footer) }, { quoted: msg });
          return;
        }

        await socket.sendMessage(from, { text: redDragon('PLAY', ['Please wait, your download is in progress.'], footer) }, { quoted: msg });

        let result;
        try {
          result = await module.exports.downloadPlayAudio(video.url);
        } catch (error) {
          const message = error.message === 'Failed to fetch audio from the API. Please try again later.'
            ? error.message
            : 'Download failed. Please try again later.';
          await socket.sendMessage(from, { text: redDragon('PLAY ERROR', [message], footer) }, { quoted: msg });
          return;
        }

        const title = clean(result.title || video.title, 'red-dragon-play');
        const fileName = cleanFileName(`${title}.mp3`, 'red-dragon-play.mp3');
        await socket.sendMessage(from, {
          audio: { url: result.downloadUrl },
          mimetype: 'audio/mpeg',
          fileName
        }, { quoted: msg });
        return;
      }

      if (command === 'songsearch' || command === 'findsong') {
        const query = requireText(args, `.${command} <lyrics, song, or artist>`);
        const data = await searchSong(query);
        await socket.sendMessage(from, { text: redDragon('SONG SEARCH', linesForSongSearch(data), footer) }, { quoted: msg });
        return;
      }

      if (command === 'trending' || command === 'audiomacktrending') {
        const data = await trendingSongs();
        await socket.sendMessage(from, { text: redDragon('AUDIOMACK TRENDING', formatTrending(data), footer) }, { quoted: msg });
        return;
      }

      if (command === 'ceenaija') {
        const query = requireText(args, '.ceenaija <song or artist>');
        const data = await searchCeenaija(query);
        await socket.sendMessage(from, { text: redDragon('CEENAIJA SEARCH', formatCeenaija(data), footer) }, { quoted: msg });
        return;
      }

      if (command === 'anime' || command === 'crunchyroll') {
        const query = requireText(args, `.${command} <anime title>`);
        const data = await searchAnime(query);
        await socket.sendMessage(from, { text: redDragon('CRUNCHYROLL SEARCH', formatAnime(data), footer) }, { quoted: msg });
        return;
      }

      if (command === 'ytdl' || command === 'ytvideo' || command === 'ytaudio') {
        const url = requireText(args, `.${command} <YouTube URL>`);
        if (!/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(url)) {
          throw new Error('Use a complete YouTube URL. Search phrases are not supported by this endpoint.');
        }
        const type = command === 'ytaudio' ? 'audio' : 'video';
        const data = await youtubeDownload(url, type);
        if (command === 'ytdl') {
          await socket.sendMessage(from, { text: redDragon('YOUTUBE MEDIA', youtubeLines(data), footer) }, { quoted: msg });
          return;
        }

        if (command === 'ytaudio') {
          const audioUrl = data.audio?.mp3?.downloadUrl || data.audio?.m4a?.downloadUrl;
          if (!audioUrl) throw new Error('No audio format was returned.');
          await socket.sendMessage(from, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            caption: redDragon('YOUTUBE AUDIO', [`${clean(data.title)} — ${clean(data.channel)}`, 'Signed URL is temporary and was not stored.'], footer)
          }, { quoted: msg });
          return;
        }

        const video = chooseVideo(data.videoFormats || []);
        if (!video) {
          await socket.sendMessage(from, { text: redDragon('YOUTUBE VIDEO', [...youtubeLines(data), '', 'No video format under the 50 MB bot limit was available.'], footer) }, { quoted: msg });
          return;
        }
        await socket.sendMessage(from, {
          video: { url: video.downloadUrl },
          caption: redDragon('YOUTUBE VIDEO', [`${clean(data.title)} — ${clean(data.channel)}`, `Quality: ${video.label || video.quality}`, `Size: ${video.sizeLabel || bytesLabel(video.sizeBytes)}`, 'Signed URL is temporary and was not stored.'], footer)
        }, { quoted: msg });
      }
    } catch (error) {
      await socket.sendMessage(from, { text: redDragon('OMEGATECH ERROR', [error.message], footer) }, { quoted: msg });
    }
  }
};
