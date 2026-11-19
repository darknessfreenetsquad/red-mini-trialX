'use strict';

module.exports = {
  commands: ['alive', 'ping'],
  async run(ctx) {
    const { socket, msg, from, command, footer, ownerNumber, botName, getUptime } = ctx;
    if (command === 'ping') {
      const started = Date.now();
      await socket.sendMessage(from, { react: { text: '⏳', key: msg.key } });
      const latency = Date.now() - started;
      const speed = latency < 100 ? 'Excellent' : latency < 300 ? 'Good' : 'Slow';
      await socket.sendMessage(from, {
        text: `⚡ *PONG!*\n━━━━━━━━━━━━━━━━━━\n📡 *Latency:* ${latency}ms\n🚀 *Speed:* ${speed}\n━━━━━━━━━━━━━━━━━━\n${footer}`
      }, { quoted: msg });
      return;
    }

    const uptime = getUptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    await socket.sendMessage(from, {
      text: `🔴 *${botName.toUpperCase()} IS ONLINE* 🔴\n━━━━━━━━━━━━━━━━━━\n🤖 *Bot:* ${botName}\n👑 *Owner:* ${ownerNumber || 'Not configured'}\n⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n📡 *Status:* Active\n🇿🇦 *Region:* South Africa\n━━━━━━━━━━━━━━━━━━\n${footer}`
    }, { quoted: msg });
  }
};
