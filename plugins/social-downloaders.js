'use strict';

const axios = require('axios');
const { redDragon } = require('../lib/response-style');

const providers = {
  fb: {
    aliases: ['fb', 'facebook'],
    endpoints: [
      {
        url: process.env.FACEBOOK_API_ENDPOINT || 'https://api.omegatech.app/api/download/facebook',
        params: input => ({ action: 'download', url: input })
      },
      {
        url: 'https://api.siputzx.my.id/api/download/fb',
        params: input => ({ url: input })
      }
    ],
    field: data => data?.data?.directUrl || data?.result?.hd || data?.result?.video?.[0]?.url,
    type: 'video',
    label: 'Facebook'
  },
  instagram: { aliases: ['instagram', 'ig'], endpoint: 'https://api.siputzx.my.id/api/download/instagram', field: data => data?.result?.[0]?.url || data?.result?.url, type: 'video', label: 'Instagram' },
  tiktok: { aliases: ['tiktok', 'tt'], endpoint: 'https://api.siputzx.my.id/api/download/tiktok', field: data => data?.result?.video, type: 'video', label: 'TikTok' },
  twitter: { aliases: ['twitter', 'tw'], endpoint: 'https://api.siputzx.my.id/api/download/twitter', field: data => data?.result?.hd, type: 'video', label: 'Twitter' }
};
const aliases = Object.values(providers).flatMap(provider => provider.aliases);

function findProvider(command) {
  return Object.values(providers).find(provider => provider.aliases.includes(command));
}

module.exports = {
  commands: aliases,
  async run(ctx) {
    const { socket, from, msg, command, args, footer } = ctx;
    const provider = findProvider(command);
    const url = args[0];
    if (!url) {
      await socket.sendMessage(from, { text: redDragon(`${provider.label} DOWNLOADER`, [`Usage: .${command} <url>`], footer) }, { quoted: msg });
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      await socket.sendMessage(from, { text: redDragon('INVALID URL', ['Use a complete http or https link.'], footer) }, { quoted: msg });
      return;
    }
    await socket.sendMessage(from, { react: { text: '📥', key: msg.key } });
    try {
      const targets = provider.endpoints || [{ url: provider.endpoint, params: () => ({ url }) }];
      let mediaUrl = null;
      let lastError = null;
      for (const target of targets) {
        try {
          const { data } = await axios.get(target.url, { timeout: 15000, params: target.params(url) });
          mediaUrl = provider.field(data);
          if (mediaUrl && /^https:\/\//i.test(mediaUrl)) break;
          lastError = new Error('Provider returned no downloadable media.');
        } catch (error) {
          lastError = error;
        }
      }
      if (!mediaUrl || !/^https:\/\//i.test(mediaUrl)) {
        throw lastError || new Error('No downloadable media was returned.');
      }
      await socket.sendMessage(from, {
        [provider.type]: { url: mediaUrl },
        caption: redDragon(`${provider.label} DOWNLOAD`, ['Download complete.'], footer)
      }, { quoted: msg });
    } catch (error) {
      console.error(`${command} downloader error:`, error.message);
      await socket.sendMessage(from, { text: redDragon(`${provider.label} DOWNLOAD FAILED`, [error.message], footer) }, { quoted: msg });
    }
  }
};
