'use strict';

const { redDragon } = require('../lib/theme');

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
        text: redDragon('PONG', [`Latency: ${latency}ms`, `Speed: ${speed}`], footer)
      }, { quoted: msg });
      return;
    }

    const uptime = getUptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    await socket.sendMessage(from, {
      text: redDragon('BOT ONLINE', [`Bot: ${botName}`, `Owner: ${ownerNumber || 'Not configured'}`, `Uptime: ${hours}h ${minutes}m ${seconds}s`, 'Status: Active', 'Region: South Africa'], footer)
    }, { quoted: msg });
  }
};
