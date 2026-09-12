const { randomUUID } = require('crypto');
const pool = require('./db');
const { retrieve } = require('./rag');
const { callJson } = require('./llm');
const { intakeSystemPrompt, reportSystemPrompt } = require('./prompts');
const { buildPdfBuffer } = require('./pdf');

const MAX_PATIENT_TURNS = 12;
const VALID_URGENCY = ['routine', 'moderate', 'urgent', 'emergency'];

async function getPatientInfo(patientId) {
  const { rows } = await pool.query(
    `SELECT u.name, p.age, p.gender, p.village, p.language_pref
     FROM patients p JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [patientId]
  );
  if (!rows.length) return {};
  const r = rows[0];
  return { name: r.name, age: r.age, gender: r.gender, village: r.village, languagePref: r.language_pref };
}

async function startConversation(patientId, language) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO conversations (id, patient_id, status, language, started_at) VALUES ($1, $2, 'ACTIVE', $3, now())`,
    [id, patientId, language]
  );
  return id;
}

async function getConversation(conversationId) {
  const { rows } = await pool.query(`SELECT id, patient_id, status FROM conversations WHERE id = $1`, [conversationId]);
  return rows[0];
}

async function getMessages(conversationId) {
  const { rows } = await pool.query(
    `SELECT sender, text FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );
  return rows;
}

async function insertMessage(conversationId, sender, text) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO messages (id, conversation_id, sender, text, created_at) VALUES ($1, $2, $3, $4, now())`,
    [id, conversationId, sender, text]
  );
}

async function reactivateConversation(conversationId) {
  await pool.query(`UPDATE conversations SET status = 'ACTIVE' WHERE id = $1`, [conversationId]);
}

async function runIntakeTurn(conversationId, patientText) {
  await reactivateConversation(conversationId);
  await insertMessage(conversationId, 'PATIENT', patientText);

  const history = await getMessages(conversationId);
  const patientTurns = history.filter((m) => m.sender === 'PATIENT').length;

  const contextChunks = retrieve(patientText, 3);
  const context = contextChunks.length ? contextChunks.join('\n\n---\n\n') : '(no matching reference material)';

  const chatMessages = history.map((m) => ({
    role: m.sender === 'PATIENT' ? 'user' : 'assistant',
    content: m.text,
  }));

  let reply = '';
  let ready = false;
  try {
    const result = await callJson(intakeSystemPrompt(context), chatMessages);
    reply = (result.reply || '').trim();
    ready = Boolean(result.ready_for_report);
  } catch (e) {
    console.error('Intake turn LLM call failed:', e.message);
  }

  if (!reply) {
    reply = 'Thank you for sharing that. Could you tell me a bit more about when this started and how severe it feels?';
  }
  if (patientTurns >= MAX_PATIENT_TURNS) ready = true;

  await insertMessage(conversationId, 'AGENT', reply);
  return { reply, ready };
}

function normalizeSummary(raw) {
  return {
    chief_complaint: raw.chief_complaint || 'Not specified',
    symptom_summary: Array.isArray(raw.symptom_summary) ? raw.symptom_summary : [],
    relevant_history: raw.relevant_history || 'None reported',
    red_flags: Array.isArray(raw.red_flags) ? raw.red_flags : [],
    urgency_level: VALID_URGENCY.includes(raw.urgency_level) ? raw.urgency_level : 'moderate',
    possible_conditions: Array.isArray(raw.possible_conditions) ? raw.possible_conditions : [],
    recommended_next_steps: raw.recommended_next_steps || 'Please review the transcript directly.',
  };
}

async function generateReport(conversationId, patientId) {
  const patientInfo = await getPatientInfo(patientId);
  const history = await getMessages(conversationId);
  const transcript = history.map((m) => `${m.sender}: ${m.text}`).join('\n');

  const contextChunks = retrieve(transcript.slice(-1000), 4);
  const context = contextChunks.length ? contextChunks.join('\n\n---\n\n') : '(no matching reference material)';

  let summary;
  try {
    const raw = await callJson(
      reportSystemPrompt(patientInfo, context),
      [{ role: 'user', content: `Conversation transcript:\n${transcript}` }],
      4096
    );
    summary = normalizeSummary(raw);
  } catch (e) {
    console.error('Report generation LLM call failed:', e.message);
    summary = normalizeSummary({
      chief_complaint: 'Unable to automatically summarize this conversation - manual review required.',
      recommended_next_steps: 'Please review the full transcript directly with the patient.',
    });
  }

  const pdfBuffer = await buildPdfBuffer(patientInfo, summary);
  const urgencyEnum = summary.urgency_level.toUpperCase();

  // A conversation can only have one report (unique constraint) — if the patient resumed
  // an already-reported case, update that report in place rather than inserting a new one.
  const existing = await pool.query(`SELECT id FROM reports WHERE conversation_id = $1`, [conversationId]);

  let reportId;
  if (existing.rows.length) {
    reportId = existing.rows[0].id;
    await pool.query(
      `UPDATE reports
         SET summary_json = $1, pdf_data = $2, urgency_level = $3, review_status = 'PENDING', next_action = 'NONE'
       WHERE id = $4`,
      [JSON.stringify(summary), pdfBuffer, urgencyEnum, reportId]
    );
  } else {
    reportId = randomUUID();
    await pool.query(
      `INSERT INTO reports
         (id, patient_id, conversation_id, summary_json, pdf_data, urgency_level, review_status, next_action, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', 'NONE', now())`,
      [reportId, patientId, conversationId, JSON.stringify(summary), pdfBuffer, urgencyEnum]
    );
  }

  await pool.query(`UPDATE conversations SET status = 'COMPLETED' WHERE id = $1`, [conversationId]);

  return reportId;
}

module.exports = { startConversation, getConversation, getMessages, runIntakeTurn, generateReport };
