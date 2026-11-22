'use strict';
const axios = require('axios');
const BASE_URL = 'https://ytm.xcasper.space';
const REQUEST_TIMEOUT = 15000;
function artistNames(item) {
  if (Array.isArray(item?.artists)) return item.artists.map(artist => artist?.name).filter(Boolean).join(', ');
  return item?.artist || item?.subtitle || item?.author?.name || '';
}
function normalizeTrack(item) {
  if (!item || typeof item !== 'object') return null;
  const id = String(item.videoId || item.video_id || item.id || '').trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return {
    id,
    title: String(item.title || 'YouTube Music track').trim(),
    artist: artistNames(item),
    thumbnail: item.thumbnail || item.thumbnails?.[0]?.url || null,
    sourceUrl: `https://music.youtube.com/watch?v=${id}`,
    downloadUrl: `${BASE_URL}/api/download/${encodeURIComponent(id)}`
  };
}
async function search(query) {
  const text = String(query || '').trim().slice(0, 200);
  if (!text) return null;
  const { data } = await axios.get(`${BASE_URL}/api/search`, {
    timeout: REQUEST_TIMEOUT,
    params: { q: text },
    headers: { Accept: 'application/json', 'User-Agent': 'RedMini/1.0' }
  });
  if (data?.success === false || data?.status === false) throw new Error(data?.error || data?.message || 'YouTube Music search failed.');
  const candidates = [data?.topResult, ...(Array.isArray(data?.results) ? data.results : [])];
  for (const item of candidates) {
    const track = normalizeTrack(item);
    if (track && (!item.type || item.type === 'song' || item.type === 'video')) return track;
  }
  return null;
}
function downloadUrl(id) {
  const videoId = String(id || '').trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('Invalid YouTube Music track ID.');
  return `${BASE_URL}/api/download/${encodeURIComponent(videoId)}`;
}
module.exports = { BASE_URL, search, downloadUrl, normalizeTrack };
