require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 10000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/chat', async (req, res) => {
  try {
const anthropicApiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
      console.error('ERREUR: Clé API manquante');
      return res.status(500).json({ error: 'Clé API manquante' });
    }
    const { model, max_tokens, system, messages } = req.body;
    console.log('Appel API avec modele:', model);
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
    console.log('Reponse API status:', response.status, data.type || data.error?.type);
    if (!response.ok) {
      console.error('Erreur API Anthropic:', JSON.stringify(data));
    }
    res.json(data);
  } catch (err) {
    console.error('Exception:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Serveur sur port ' + PORT);
});
