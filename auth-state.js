'use strict';

const { BufferJSON, initAuthCreds, proto } = require('@whiskeysockets/baileys');

// Baileys changes both credentials and Signal keys as it runs. Persist both,
// serializing Buffers exactly as the library's file-based auth store does.
async function useSupabaseAuthState(supabase, number) {
  const { data, error } = await supabase.from('sessions')
    .select('creds, keys').eq('number', number).maybeSingle();
  if (error) throw new Error(`Unable to load session: ${error.message}`);

  const decode = value => value == null ? null : JSON.parse(JSON.stringify(value), BufferJSON.reviver);
  const creds = decode(data?.creds) || initAuthCreds();
  const keys = decode(data?.keys) || {};
  let pendingWrite = Promise.resolve();
  let stopped = false;

  function persist() {
    if (stopped) return Promise.resolve();
    // Capture a snapshot before queuing the write so later mutations cannot race it.
    const snapshot = JSON.parse(JSON.stringify({ creds, keys }, BufferJSON.replacer));
    const write = async () => {
      const { error: writeError } = await supabase.from('sessions').upsert({
        number, ...snapshot, updated_at: new Date().toISOString()
      });
      if (writeError) throw new Error(`Unable to save session: ${writeError.message}`);
    };
    const result = pendingWrite.catch(() => {}).then(write);
    pendingWrite = result;
    return result;
  }

  return {
    state: {
      creds,
      keys: {
        async get(type, ids) {
          const result = {};
          for (const id of ids) {
            let value = keys[type]?.[id];
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            result[id] = value;
          }
          return result;
        },
        async set(data) {
          for (const [type, items] of Object.entries(data)) {
            keys[type] ||= {};
            for (const [id, value] of Object.entries(items)) {
              if (value == null) delete keys[type][id];
              else keys[type][id] = value;
            }
          }
          await persist();
        }
      }
    },
    saveCreds: persist,
    flush: () => pendingWrite,
    async stop() {
      stopped = true;
      await pendingWrite.catch(() => {});
    }
  };
}

module.exports = { useSupabaseAuthState };
