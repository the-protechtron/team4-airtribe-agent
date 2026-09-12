require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { requirePatient } = require('./auth');
const convo = require('./conversation');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

function wrap(fn) {
  return (req, res) => fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  });
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/conversations/start', requirePatient, wrap(async (req, res) => {
  const language = req.body.language || 'en-IN';
  const conversationId = await convo.startConversation(req.user.patientId, language);
  res.json({ conversationId });
}));

app.post('/conversations/:id/messages', requirePatient, wrap(async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });

  const conversation = await convo.getConversation(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (conversation.patient_id !== req.user.patientId) return res.status(403).json({ error: 'Forbidden' });

  // Resuming an already-completed case is allowed — runIntakeTurn reactivates it and keeps
  // the full prior context, so the patient can add new information to the same case.
  const { reply, ready } = await convo.runIntakeTurn(req.params.id, text);

  let reportId = null;
  if (ready) {
    reportId = await convo.generateReport(req.params.id, conversation.patient_id);
  }

  res.json({ agentReply: reply, done: ready, reportId });
}));

app.get('/conversations/:id', requirePatient, wrap(async (req, res) => {
  const conversation = await convo.getConversation(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (conversation.patient_id !== req.user.patientId) return res.status(403).json({ error: 'Forbidden' });

  const messages = await convo.getMessages(req.params.id);
  res.json({ status: conversation.status, messages });
}));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Airtribe AI service listening on port ${PORT}`));
