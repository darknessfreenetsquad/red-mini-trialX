'use strict';

const axios = require('axios');
const crypto = require('crypto');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url, options = {}) {
  const response = await axios({
    method: 'GET',
    url,
    timeout: options.timeout || 30000,
    ...options,
    headers: { 'User-Agent': USER_AGENT, ...(options.headers || {}) }
  });
  return response.data;
}

async function fetchBuffer(url, options = {}) {
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'arraybuffer',
    timeout: options.timeout || 60000,
    ...options,
    headers: { 'User-Agent': USER_AGENT, ...(options.headers || {}) }
  });
  return { buffer: Buffer.from(response.data), headers: response.headers, status: response.status };
}

function fetchUrl(url, options = {}) {
  return fetchJson(url, options);
}

function getRandom(ext = '') {
  const suffix = String(ext || '');
  return `${crypto.randomBytes(6).toString('hex')}${suffix.startsWith('.') ? suffix : suffix ? `.${suffix}` : ''}`;
}

function isUrl(value) {
  return /^https?:\/\/[^\s]+$/i.test(String(value || ''));
}

function isNumber(value) {
  return /^\d+$/.test(String(value || '').trim());
}

module.exports = { sleep, fetchJson, fetchBuffer, fetchUrl, getRandom, isUrl, isNumber };
