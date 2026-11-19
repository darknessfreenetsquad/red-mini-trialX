'use strict';

const axios = require('axios');
const { redDragon } = require('../lib/response-style');

const providers = {
  fb: { aliases: ['fb', 'facebook'], endpoint: 'https://api.siputzx.my.id/api/download/fb', field: data => data?.result?.hd, type: 'video', label: 'Facebook' },
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
      const { data } = await axios.get(provider.endpoint, { timeout: 30000, params: { url } });
      const mediaUrl = provider.field(data);
      if (!mediaUrl || !/^https:\/\//i.test(mediaUrl)) throw new Error('No downloadable media was returned.');
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
