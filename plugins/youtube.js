'use strict';

const axios = require('axios');
const { redDragon, cleanFileName } = require('../lib/response-style');

const DOWNLOAD_BASE = process.env.MEDIA_DOWNLOAD_API_BASE || 'https://api.dreaded.site/api/ytdl';

function encodeVideoUrl(url) {
  return Buffer.from(url, 'utf8').toString('base64url');
}

function decodeVideoUrl(value) {
  try {
    const url = Buffer.from(value, 'base64url').toString('utf8');
    if (!/^https:\/\/((www\.)?youtube\.com|youtu\.be)\//i.test(url)) throw new Error('Invalid YouTube URL');
    return url;
  } catch (_) {
    throw new Error('Invalid YouTube selection');
  }
}

async function searchYouTube(query) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YouTube search is not configured. Set YOUTUBE_API_KEY on the server.');
  const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    timeout: 15000,
    params: { part: 'snippet', q: query, type: 'video', maxResults: 1, key }
  });
  const item = data?.items?.[0];
  if (!item?.id?.videoId) return null;
  return {
    id: item.id.videoId,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
  };
}

async function download(url, type) {
  const endpoint = type === 'video' ? 'video' : 'audio';
  const { data } = await axios.get(`${DOWNLOAD_BASE}/${endpoint}`, {
    timeout: 45000,
    params: { url }
  });
  const downloadUrl = data?.result?.downloadUrl;
  if (!downloadUrl || !/^https:\/\//i.test(downloadUrl)) throw new Error(`The media provider returned no ${type} download.`);
  return downloadUrl;
}

async function sendSearchButtons(ctx, result) {
  const { socket, from, msg, prefix, footer } = ctx;
  const encoded = encodeVideoUrl(result.url);
  await socket.sendMessage(from, {
    image: result.thumbnail ? { url: result.thumbnail } : undefined,
    caption: redDragon('YOUTUBE AUDIO', [`${result.title}`, `Channel: ${result.channel}`, 'Choose a format below.'], footer),
    footer,
    buttons: [
      { buttonId: `${prefix}playaudio ${encoded}`, buttonText: { displayText: '🎵 Audio' }, type: 1 },
      { buttonId: `${prefix}playdoc ${encoded}`, buttonText: { displayText: '📄 Audio document' }, type: 1 }
    ]
  }, { quoted: msg });
}

module.exports = {
  commands: ['play', 'playaudio', 'playdoc', 'video', 'yta', 'ytv', 'ytmp3', 'ytmp4', 'ytmpdoc', 'play3', 'song2'],
  searchYouTube,
  async run(ctx) {
    const { socket, from, msg, command, args, prefix, footer } = ctx;
    if (!args.length) {
      const usage = ['video', 'ytv', 'ytmp4'].includes(command) ? `.${command} <video name or YouTube link>` : `.${command} <song name or YouTube link>`;
      await socket.sendMessage(from, { text: `Usage: ${usage}` }, { quoted: msg });
      return;
    }

    await socket.sendMessage(from, { react: { text: command === 'video' ? '🎬' : '🎵', key: msg.key } });
    try {
      let url;
      let title = 'YouTube media';
      let result;
      if (command === 'playaudio' || command === 'playdoc') {
        url = decodeVideoUrl(args[0]);
      } else {
        const directUrl = args[0];
        if (['ytmp3', 'ytmp4', 'ytmpdoc'].includes(command) && /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(directUrl)) {
          url = directUrl;
          title = 'YouTube download';
        } else {
          result = await searchYouTube(args.join(' '));
          if (!result) {
            await socket.sendMessage(from, { text: redDragon('YOUTUBE SEARCH', ['No result found.'], footer) }, { quoted: msg });
            return;
          }
          url = result.url;
          title = result.title;
        }
      }

      if (command === 'play') {
        await sendSearchButtons(ctx, result);
        return;
      }

      const type = ['video', 'ytv', 'ytmp4'].includes(command) ? 'video' : 'audio';
      const downloadUrl = await download(url, type);
      if (type === 'video') {
        await socket.sendMessage(from, {
          video: { url: downloadUrl },
          caption: redDragon('YOUTUBE VIDEO', [title], footer),
          mimetype: 'video/mp4'
        }, { quoted: msg });
      } else if (command === 'playdoc' || command === 'ytmpdoc') {
        await socket.sendMessage(from, {
          document: { url: downloadUrl },
          mimetype: 'audio/mpeg',
          fileName: `${cleanFileName(title)}.mp3`,
          caption: redDragon('YOUTUBE AUDIO DOCUMENT', [title], footer)
        }, { quoted: msg });
      } else {
        await socket.sendMessage(from, {
          audio: { url: downloadUrl },
          mimetype: 'audio/mpeg',
          ptt: false,
          caption: redDragon('YOUTUBE AUDIO', [title], footer)
        }, { quoted: msg });
      }
    } catch (error) {
      console.error(`${command} plugin error:`, error.message);
      await socket.sendMessage(from, { text: `❌ ${error.message}` }, { quoted: msg });
    }
  }
};
