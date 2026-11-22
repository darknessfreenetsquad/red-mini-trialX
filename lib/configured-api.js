'use strict';

const axios = require('axios');
const config = require('../config');

const DEFAULT_ORDER = ['xteam', 'dzx', 'akuari', 'akuari2', 'nrtm', 'fgmods', 'violetics', 'zenzapis'];
const FALLBACK_TIMEOUT = Number(process.env.CONFIG_API_TIMEOUT_MS || 7000);
const MAX_FALLBACK_APIS = Math.max(1, Number(process.env.CONFIG_API_MAX_PROVIDERS || 3));

function isUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function findUrl(value, seen = new Set()) {
  if (isUrl(value)) return value;
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findUrl(item, seen);
      if (url) return url;
    }
    return null;
  }
  const priority = ['downloadUrl', 'download_url', 'directUrl', 'video_hd', 'video', 'audio', 'url', 'download', 'link', 'result', 'data', 'media'];
  for (const key of priority) {
    const url = findUrl(value[key], seen);
    if (url) return url;
  }
  return null;
}

function providerNames() {
  const requested = String(process.env.CONFIG_API_ORDER || '').split(',').map(value => value.trim()).filter(Boolean);
  const order = requested.length ? requested : DEFAULT_ORDER;
  return [...new Set(order)].filter(name => config.APIs?.[name]).slice(0, MAX_FALLBACK_APIS);
}

function candidateUrl(base, route) {
  return `${String(base).replace(/\/$/, '')}/${String(route).replace(/^\//, '')}`;
}

async function requestConfiguredFallback(routes, params = {}, extract = findUrl) {
  const routeList = Array.isArray(routes) ? routes : [routes];
  const candidates = providerNames().flatMap(name => routeList.map(route => ({ name, route })));
  const attempts = candidates.map(async ({ name, route }) => {
    const apiKey = config.APIKeys?.[config.APIs[name]];
    const requestParams = { ...params };
    if (apiKey) requestParams.apikey = apiKey;
    const response = await axios.get(candidateUrl(config.APIs[name], route), {
      timeout: FALLBACK_TIMEOUT,
      params: requestParams,
      headers: { Accept: 'application/json', 'User-Agent': 'RedMini/1.0' },
      validateStatus: status => status >= 200 && status < 500
    });
    if (response.status >= 400) throw new Error(`${name} HTTP ${response.status}`);
    const url = extract(response.data);
    if (!isUrl(url)) throw new Error(`${name} returned no media URL`);
    return { provider: name, url, data: response.data };
  });

  const settled = await Promise.allSettled(attempts);
  const success = settled.find(result => result.status === 'fulfilled');
  if (success) return success.value;
  const last = settled.reverse().find(result => result.status === 'rejected');
  throw last?.reason || new Error('Configured API fallbacks returned no media.');
}

async function youtubeAudio(url) {
  return requestConfiguredFallback(
    ['/api/download/ytaudio', '/api/download/ytmp3', '/api/youtube/mp3', '/api/downloader/ytmp3'],
    { url, format: 'mp3', type: 'audio', bitrate: 128 }
  );
}

async function youtubeVideo(url) {
  return requestConfiguredFallback(
    ['/api/download/ytvideo', '/api/download/ytmp4', '/api/youtube/mp4', '/api/downloader/ytmp4'],
    { url, format: '720p', type: 'video', quality: 720 }
  );
}

async function social(command, url) {
  const routes = {
    fb: ['/api/download/facebook', '/api/download/fb', '/api/downloader/facebook'],
    facebook: ['/api/download/facebook', '/api/download/fb', '/api/downloader/facebook'],
    instagram: ['/api/download/instagram', '/api/download/ig', '/api/downloader/instagram'],
    tiktok: ['/api/download/tiktok', '/api/downloader/tiktok'],
    twitter: ['/api/download/twitter', '/api/download/x', '/api/downloader/twitter']
  };
  return requestConfiguredFallback(routes[command] || [], { url });
}

module.exports = { findUrl, providerNames, requestConfiguredFallback, youtubeAudio, youtubeVideo, social };
