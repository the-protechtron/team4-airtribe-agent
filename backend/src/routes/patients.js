const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// Doctor: list all patients with latest report + activity summary
router.get('/', requireRole('DOCTOR'), async (req, res) => {
  const patients = await prisma.patient.findMany({
    include: {
      user: true,
      reports: { orderBy: { createdAt: 'desc' }, take: 1, select: {
        id: true, urgencyLevel: true, reviewStatus: true, nextAction: true, createdAt: true,
      } },
      conversations: { orderBy: { startedAt: 'desc' }, take: 1, select: { startedAt: true } },
    },
  });

  res.json(patients.map((p) => ({
    patientId: p.id,
    name: p.user.name,
    age: p.age,
    gender: p.gender,
    village: p.village,
    lastActivity: p.conversations[0]?.startedAt ?? null,
    latestReport: p.reports[0] ?? null,
  })));
});

router.get('/me', requireRole('PATIENT'), async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.user.patientId },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });
  res.json(patient);
});

// Patient: list own past conversations ("cases"), each with its report status if generated
router.get('/me/cases', requireRole('PATIENT'), async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { patientId: req.user.patientId },
    orderBy: { startedAt: 'asc' },
    include: {
      report: {
        select: { id: true, urgencyLevel: true, reviewStatus: true, nextAction: true, createdAt: true },
      },
    },
  });

  res.json(conversations.map((c, i) => ({
    caseNumber: i + 1,
    conversationId: c.id,
    startedAt: c.startedAt,
    status: c.status,
    report: c.report,
  })));
});

// Patient: full transcript + report for one of their own cases
router.get('/me/cases/:conversationId', requireRole('PATIENT'), async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.conversationId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      report: {
        select: {
          id: true, summaryJson: true, urgencyLevel: true, reviewStatus: true, nextAction: true, createdAt: true,
        },
      },
    },
  });
  if (!conversation || conversation.patientId !== req.user.patientId) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(conversation);
});

// Doctor: full detail for one patient (reports + conversation transcripts)
router.get('/:id', requireRole('DOCTOR'), async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      reports: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, conversationId: true, doctorId: true, summaryJson: true,
          urgencyLevel: true, reviewStatus: true, nextAction: true, createdAt: true,
        },
      },
      conversations: {
        orderBy: { startedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      },
    },
  });
  if (!patient) return res.status(404).json({ error: 'Not found' });
  res.json(patient);
});

module.exports = router;
