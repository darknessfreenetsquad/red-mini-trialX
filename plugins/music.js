'use strict';

const axios = require('axios');
const { redDragon } = require('../lib/response-style');

const AUDIUS_API_BASE = process.env.AUDIUS_API_BASE || 'https://api.audius.co/v1';

function cleanText(value, fallback = 'Unknown') {
  return String(value || fallback).replace(/[\r\n]+/g, ' ').trim();
}

function sourceUrl(track) {
  const permalink = String(track.permalink || '').trim();
  if (/^https:\/\//i.test(permalink)) return permalink;
  if (permalink.startsWith('/')) return `https://audius.co${permalink}`;
  if (track.slug) return `https://audius.co/${track.slug}`;
  return `https://audius.co/track/${track.id}`;
}

async function searchAudius(query) {
  const phrase = String(query || '').trim();
  if (!phrase) throw new Error('Enter a song or artist name.');
  const { data } = await axios.get(`${AUDIUS_API_BASE}/tracks/search`, {
    timeout: 15000,
    params: { query: phrase, limit: 1 }
  });
  const track = data?.data?.[0];
  if (!track?.id) return null;
  return {
    id: String(track.id),
    title: cleanText(track.title, 'Audius track'),
    artist: cleanText(track.user?.name || track.user?.handle || track.artist, 'Audius artist'),
    duration: Number.isFinite(track.duration) ? track.duration : null,
    url: sourceUrl(track),
    streamUrl: `${AUDIUS_API_BASE}/tracks/${encodeURIComponent(track.id)}/stream`,
    artwork: track.artwork?.['150x150'] || track.artwork?.['480x480'] || track.artwork?.['1000x1000'] || null,
    downloadable: track.is_downloadable === true
  };
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'unknown length';
  const minutes = Math.floor(seconds / 60);
  const remainder = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

module.exports = {
  commands: ['music', 'audius'],
  searchAudius,
  async run(ctx) {
    const { socket, from, msg, args, footer, command } = ctx;
    if (!args.length) {
      await socket.sendMessage(from, {
        text: redDragon('AUDIUS MUSIC', ['Usage: .music <song or artist>', 'Example: .music Daft Punk'], footer)
      }, { quoted: msg });
      return;
    }

    await socket.sendMessage(from, { react: { text: '🎵', key: msg.key } });
    try {
      const track = await searchAudius(args.join(' '));
      if (!track) {
        await socket.sendMessage(from, { text: redDragon('AUDIUS MUSIC', ['No track found. Try another search.'], footer) }, { quoted: msg });
        return;
      }

      const caption = redDragon('AUDIUS MUSIC', [
        `Title: ${track.title}`,
        `Artist: ${track.artist}`,
        `Length: ${formatDuration(track.duration)}`,
        `Source: ${track.url}`
      ], footer);

      await socket.sendMessage(from, {
        audio: { url: track.streamUrl },
        mimetype: 'audio/mpeg',
        ptt: false,
        caption
      }, { quoted: msg });
    } catch (error) {
      console.error(`${command} plugin error:`, error.message);
      await socket.sendMessage(from, {
        text: redDragon('AUDIUS MUSIC ERROR', [error.message], footer)
      }, { quoted: msg });
    }
  }
};
