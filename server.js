import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/reply', async (req, res) => {
  const { caseId, customerId, phone, message, agent } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message are required' });
  }

  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  
  if (!n8nWebhookUrl) {
    console.error('N8N_WEBHOOK_URL is not configured in .env');
    return res.status(500).json({ error: 'Webhook URL not configured on server' });
  }

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caseId,
        customerId,
        phone,
        message,
        agent,
      }),
    });

    if (!response.ok) {
      throw new Error(`N8n webhook responded with status: ${response.status}`);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error forwarding to n8n:', error);
    return res.status(500).json({ error: 'Failed to send reply' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
