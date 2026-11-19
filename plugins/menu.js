'use strict';

const { redDragon } = require('../lib/theme');

module.exports = {
  commands: ['menu'],
  async run(ctx) {
    const { socket, msg, from, prefix, footer, ownerNumber, botName, getUptime } = ctx;
    const uptime = getUptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const lines = [
      `Bot: ${botName}`,
      `Owner: ${ownerNumber || 'Not configured'}`,
      `Uptime: ${hours}h ${minutes}m ${seconds}s`,
      '',
      'MUSIC',
      `${prefix}play <song>  |  ${prefix}video <name>`,
      `${prefix}play3 <song>  |  ${prefix}song2 <song>`,
      `${prefix}playaudio <selection>  |  ${prefix}playdoc <selection>`,
      '',
      'DOWNLOADS',
      `${prefix}fb <url>  |  ${prefix}instagram <url>`,
      `${prefix}tiktok <url>  |  ${prefix}twitter <url>`,
      `${prefix}download <url>`,
      '',
      'TOOLS',
      `${prefix}weather <city>  |  ${prefix}google <query>`,
      `${prefix}translate <lang> <text>  |  ${prefix}calc <math>`,
      `${prefix}short <url>  |  ${prefix}jid  |  ${prefix}sticker`,
      '',
      'BOT',
      `${prefix}alive  |  ${prefix}ping  |  ${prefix}profile  |  ${prefix}stats`,
      `${prefix}theme [name]  |  ${prefix}setting`,
      '',
      'GAMES',
      `${prefix}truth  |  ${prefix}dare  |  ${prefix}rps rock`
    ];
    const menuText = redDragon('COMMAND MENU', lines, footer);
    const buttons = [
      { buttonId: `${prefix}alive`, buttonText: { displayText: 'ALIVE' }, type: 1 },
      { buttonId: `${prefix}ping`, buttonText: { displayText: 'PING' }, type: 1 },
      { buttonId: `${prefix}play`, buttonText: { displayText: 'PLAY' }, type: 1 },
      { buttonId: `${prefix}theme`, buttonText: { displayText: 'THEMES' }, type: 1 },
      { buttonId: `${prefix}rps rock`, buttonText: { displayText: 'RPS' }, type: 1 }
    ];

    await socket.sendMessage(from, { react: { text: '🔴', key: msg.key } });
    try {
      await socket.sendMessage(from, { text: menuText, footer, buttons }, { quoted: msg });
    } catch (error) {
      console.error('Menu buttons failed; sending text fallback:', error.message);
      await socket.sendMessage(from, { text: menuText }, { quoted: msg });
    }
  }
};
