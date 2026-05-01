require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => { res.json({ status: 'ok' }); });

app.post('/api/chat', async (req, res) => {
  try {
    const anthropicApiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    if (!anthropicApiKey) { return res.status(500).json({ error: 'Clé API manquante' }); }
    const { model, max_tokens, system, messages } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens, system, messages })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sms', async (req, res) => {
  try {
    const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const fromNumber = (process.env.TWILIO_FROM || '').trim();

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({ error: 'Variables Twilio manquantes' });
    }

    const { to, body } = req.body;
    if (!to || !body) {
      return res.status(400).json({ error: 'Champs "to" et "body" requis' });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({ From: fromNumber, To: to, Body: body });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Erreur Twilio' });
    }
    res.json({ success: true, sid: data.sid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => { console.log('Serveur sur port ' + PORT); });
