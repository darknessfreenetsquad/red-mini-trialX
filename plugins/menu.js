'use strict';

module.exports = {
  commands: ['menu'],
  async run(ctx) {
    const { socket, msg, from, prefix, footer, ownerNumber, botName, getUptime } = ctx;
    const uptime = getUptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const menuText = `╭───❰ 🔴 ${botName.toUpperCase()} BOT 🔴 ❱───╮
│
│ 🤖 *Name:* ${botName}
│ 👑 *Owner:* ${ownerNumber || 'Not configured'}
│ ⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s
│ 📡 *Status:* Active
│ 🇿🇦 *Region:* South Africa
│
╰─────────────────────╯

╭───❰ 📥 DOWNLOADER ❱───╮
│ 🎵 ${prefix}play <song>
│ 🎬 ${prefix}video <name>
│ 📘 ${prefix}fb <url>
│ 🎨 ${prefix}sticker
│ 📸 ${prefix}instagram <url>
│ 🐦 ${prefix}twitter <url>
│ 📹 ${prefix}tiktok <url>
╰─────────────────────╯

╭───❰ 🛠️ TOOLS ❱───╮
│ 🌤️ ${prefix}weather <city>
│ 🔍 ${prefix}google <query>
│ 📝 ${prefix}translate <text>
│ 🔗 ${prefix}short <url>
│ 🧮 ${prefix}calc <math>
│ 🆔 ${prefix}jid
│ 💾 ${prefix}save
│ 🔐 ${prefix}pair <number>
╰─────────────────────╯

╭───❰ ⚙️ SETTINGS ❱───╮
│ 🤖 ${prefix}alive
│ ⚡ ${prefix}ping
│ 🎭 ${prefix}profile
│ 📊 ${prefix}stats
│ 🔧 ${prefix}setting
╰─────────────────────╯

╭───❰ 👑 OWNER ❱───╮
│ 📢 ${prefix}broadcast
│ 👥 ${prefix}admin
│ 📰 ${prefix}newsletter
│ 🗑️ ${prefix}deleteme
╰─────────────────────╯

${footer}`;
    const buttons = [
      { buttonId: `${prefix}alive`, buttonText: { displayText: '🤖 ALIVE' }, type: 1 },
      { buttonId: `${prefix}ping`, buttonText: { displayText: '⚡ PING' }, type: 1 },
      { buttonId: `${prefix}sticker`, buttonText: { displayText: '🎨 STICKER' }, type: 1 },
      { buttonId: `${prefix}play`, buttonText: { displayText: '🎵 PLAY' }, type: 1 },
      { buttonId: `${prefix}weather`, buttonText: { displayText: '🌤️ WEATHER' }, type: 1 }
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
