require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Nécessaire pour les webhooks Twilio
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 10000;

function getTwilioConfig() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN || '').trim();
  const fromNumber = (process.env.TWILIO_FROM || process.env.TWILIO_NUMBER || '').trim();

  return { accountSid, authToken, fromNumber };
}

app.get('/', (req, res) => { res.json({ status: 'ok' }); });

// Endpoint de test — appeler https://repondeur-yvelines.onrender.com/test-sms pour vérifier Twilio
app.get('/test-sms', async (req, res) => {
  const { accountSid, authToken, fromNumber } = getTwilioConfig();
  const ownerNumber = (process.env.OWNER_PHONE || '').trim();
  res.json({
    accountSid_present: !!accountSid,
    accountSid_preview: accountSid ? accountSid.slice(0, 6) + '...' : 'MANQUANT',
    authToken_present: !!authToken,
    fromNumber: fromNumber || 'MANQUANT',
    ownerPhone: ownerNumber || 'MANQUANT'
  });
});

// Fonction helper pour envoyer un SMS via Twilio API
async function sendSMS(to, body) {
  const { accountSid, authToken, fromNumber } = getTwilioConfig();
  if (!accountSid || !authToken || !fromNumber) throw new Error('Variables Twilio manquantes');
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
    const sidPreview = accountSid ? `${accountSid.slice(0, 8)}...` : 'missing';
    throw new Error(`Twilio auth/message error (${sidPreview}): ${data.message || 'Erreur Twilio'}`);
  }

  return data;
}

// Webhook Twilio — déclenché à chaque appel entrant sur le numéro Twilio
app.post('/voice', async (req, res) => {
  const callerNumber = req.body.From || 'Numéro inconnu';
  const ownerNumber = (process.env.OWNER_PHONE || '').trim();

  // Répondre immédiatement avec TwiML (message vocal)
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">
    Bonjour, vous avez contacté Yvelines Group Déménagement.
    Nous ne sommes pas disponibles pour le moment.
    Un conseiller vous rappellera très prochainement.
    Vous pouvez également nous joindre par email à contact arobase yvelines tiret group tiret dem point com.
    Merci de votre confiance. Au revoir.
  </Say>
  <Hangup/>
</Response>`);

  // Envoyer un SMS de notification au propriétaire (en arrière-plan)
  if (ownerNumber) {
    const message = `📞 Appel manqué Yvelines Group\nNuméro : ${callerNumber}\nRappeler dès que possible !`;
    sendSMS(ownerNumber, message).catch(err => console.error('SMS erreur:', err));
  }
});

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

// Endpoint SMS manuel (depuis le site ou autre)
app.post('/api/sms', async (req, res) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      return res.status(400).json({ error: 'Champs "to" et "body" requis' });
    }
    const data = await sendSMS(to, body);
    if (data.error_code) {
      return res.status(400).json({ error: data.message || 'Erreur Twilio' });
    }
    res.json({ success: true, sid: data.sid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => { console.log('Serveur sur port ' + PORT); });
