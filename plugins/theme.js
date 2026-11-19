'use strict';

const { listThemes, getActiveThemeName, setActiveTheme, redDragon } = require('../lib/theme');

module.exports = {
  commands: ['theme', 'settheme'],
  async run(ctx) {
    const { socket, from, msg, args, footer, isOwner } = ctx;
    if (!isOwner) {
      await socket.sendMessage(from, { text: redDragon('THEME', ['Owner only.'], footer) }, { quoted: msg });
      return;
    }
    const available = listThemes();
    const requested = args[0]?.toLowerCase();
    if (!requested) {
      await socket.sendMessage(from, {
        text: redDragon('THEMES', [`Active: ${getActiveThemeName()}`, `Available: ${available.join(', ') || 'none'}`, 'Usage: .theme <name>'], footer)
      }, { quoted: msg });
      return;
    }
    if (!setActiveTheme(requested)) {
      await socket.sendMessage(from, { text: redDragon('THEME', [`Unknown theme: ${requested}`, `Available: ${available.join(', ') || 'none'}`], footer) }, { quoted: msg });
      return;
    }
    await socket.sendMessage(from, { text: redDragon('THEME UPDATED', [`Active theme: ${requested}`, 'New responses use this style.'], footer) }, { quoted: msg });
  }
};
