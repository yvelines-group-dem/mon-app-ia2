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
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicApiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens, system, messages }) });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => { console.log('Serveur sur port ' + PORT); });
