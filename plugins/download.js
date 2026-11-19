'use strict';

const axios = require('axios');
const { redDragon } = require('../lib/response-style');

module.exports = {
  commands: ['download'],
  async run(ctx) {
    const { socket, from, msg, args, footer } = ctx;
    const url = args[0];
    if (!url) {
      await socket.sendMessage(from, { text: redDragon('UNIVERSAL DOWNLOADER', ['Usage: .download <url>'], footer) }, { quoted: msg });
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      await socket.sendMessage(from, { text: redDragon('INVALID URL', ['Use a complete http or https link.'], footer) }, { quoted: msg });
      return;
    }
    await socket.sendMessage(from, { react: { text: '📥', key: msg.key } });
    try {
      const { data } = await axios.get('https://omegatech-api.dixonomega.tech/downloader/all', {
        timeout: 45000,
        params: { url }
      });
      const mediaUrl = data?.result?.video?.[0]?.url;
      if (!data?.success || !/^https:\/\//i.test(mediaUrl || '')) throw new Error('No downloadable video was returned.');
      await socket.sendMessage(from, {
        video: { url: mediaUrl },
        caption: redDragon('DOWNLOAD COMPLETE', ['Media sent successfully.'], footer)
      }, { quoted: msg });
    } catch (error) {
      console.error('universal downloader error:', error.message);
      await socket.sendMessage(from, { text: redDragon('DOWNLOAD FAILED', [error.message], footer) }, { quoted: msg });
    }
  }
};
