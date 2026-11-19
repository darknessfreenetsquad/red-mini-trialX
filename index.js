const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8002;
const defaultConfig = require('./config');
const code = require('./pair');

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
app.use('/code', code);

app.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'status.html')));
app.get('/pair', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));

app.get('/api/status', async (req, res) => {
    const sessions = code.getActiveSessions();
    const database = await code.checkDatabase();
    res.set('Cache-Control', 'no-store').json({
        status: 'online',
        botName: process.env.BOT_NAME || 'Red Mini',
        ownerNumber: /^\d{10,15}$/.test(process.env.OWNER_NUMBER || defaultConfig.OWNER_NUMBER || '')
            ? (process.env.OWNER_NUMBER || defaultConfig.OWNER_NUMBER)
            : null,
        newsletter: process.env.NEWSLETTER_JID || '120363427119111004@newsletter',
        uptime: process.uptime(),
        activeSessions: sessions.length,
        // Do not expose complete phone numbers on the public status endpoint.
        sessions: sessions.map(number => '*'.repeat(Math.max(0, number.length - 4)) + number.slice(-4)),
        database,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => res.redirect('/status'));

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Red Mini listening on port ${PORT}`);
        code.startSavedSessions().catch(err => console.error('Could not restore sessions:', err.message));
    });
}

module.exports = app;
