require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `Tu es l'assistant virtuel d'Yvelines Group Déménagement, une entreprise professionnelle de déménagement dans les Yvelines (78). 
      Tu réponds en français, de façon courte et professionnelle.
      Infos importantes :
      - Téléphone : 01 88 48 19 72
      - Email : contact@yvelines-group-dem.com
      - Adresse : 131 Bd Carnot, Le Vésinet 78110
      - Horaires : Lun-Ven 8h-19h, Sam 9h-17h
      - 4 formules : Éco, Éco Plus, Standard, Confort
      - Devis gratuit sous 24h
      - Plus de 10 ans d'expérience
      Tu aides les visiteurs à obtenir un devis, répondre à leurs questions et les orienter vers les bons services.`,
      messages: [{ role: 'user', content: message }]
    });
    res.json({ reply: response.content[0].text });
  } catch (error) {
    res.status(500).json({ reply: 'Erreur: ' + error.message });
  }
});

app.listen(3000, () => {
  console.log('Serveur sur http://localhost:3000');
});