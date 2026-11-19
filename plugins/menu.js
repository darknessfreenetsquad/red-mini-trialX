'use strict';

const { loadPlugins } = require('../plugin-loader');
const { getHeader, getFooter } = require('../lib/theme');

const CATEGORIES = [
  { icon: '⬇️', name: 'Downloaders', commands: ['download', 'fb', 'facebook', 'instagram', 'ig', 'tiktok', 'tt', 'twitter', 'tw'] },
  { icon: '🎵', name: 'Music & Audio', commands: ['play', 'play3', 'song2', 'playaudio', 'playdoc', 'video', 'yta', 'ytv', 'ytmp3', 'ytmp4', 'ytmpdoc'] },
  { icon: '🔧', name: 'Tools', commands: ['weather', 'google', 'translate', 'calc', 'short', 'jid', 'sticker', 'pair'] },
  { icon: '😄', name: 'Fun & Games', commands: ['truth', 'dare', 'rps'] },
  { icon: '📊', name: 'Bot Info', commands: ['alive', 'ping', 'profile', 'stats', 'setting', 'theme', 'settheme'] },
  { icon: '👑', name: 'Owner', commands: ['broadcast', 'admin', 'newsletter', 'deleteme'] }
];
const BAR = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

function buildMenu(prefix) {
  const registry = loadPlugins();
  const available = new Set(registry.keys());
  available.delete('menu');
  const assigned = new Set();
  const sections = [];

  for (const category of CATEGORIES) {
    const commands = category.commands.filter(command => available.has(command));
    if (!commands.length) continue;
    commands.forEach(command => assigned.add(command));
    sections.push([
      `╭─「 ${category.icon} ${category.name} 」`,
      ...commands.map(command => `┃  ⌬ ─· \`${prefix}${command}\``),
      `╰${BAR}╯`
    ].join('\n'));
  }

  const remaining = [...available].filter(command => !assigned.has(command));
  if (remaining.length) {
    sections.push([
      '╭─「 🔧 Other 」',
      ...remaining.map(command => `┃  ⌬ ─· \`${prefix}${command}\``),
      `╰${BAR}╯`
    ].join('\n'));
  }
  return [...getHeader(prefix), '', ...sections.join('\n\n').split('\n'), '', ...getFooter(prefix)].join('\n');
}

module.exports = {
  commands: ['menu'],
  buildMenu,
  async run(ctx) {
    const { socket, msg, from, prefix } = ctx;
    const menuText = buildMenu(prefix);
    const buttons = [
      { buttonId: `${prefix}alive`, buttonText: { displayText: 'ALIVE' }, type: 1 },
      { buttonId: `${prefix}ping`, buttonText: { displayText: 'PING' }, type: 1 },
      { buttonId: `${prefix}play`, buttonText: { displayText: 'PLAY' }, type: 1 },
      { buttonId: `${prefix}theme`, buttonText: { displayText: 'THEMES' }, type: 1 },
      { buttonId: `${prefix}rps rock`, buttonText: { displayText: 'RPS' }, type: 1 }
    ];

    await socket.sendMessage(from, { react: { text: '🔴', key: msg.key } });
    try {
      await socket.sendMessage(from, { text: menuText, buttons }, { quoted: msg });
    } catch (error) {
      console.error('Menu buttons failed; sending text fallback:', error.message);
      await socket.sendMessage(from, { text: menuText }, { quoted: msg });
    }
  }
};
