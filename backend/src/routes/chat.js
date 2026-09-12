const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/threads', async (req, res) => {
  const where = req.user.role === 'DOCTOR'
    ? { doctorId: req.user.doctorId }
    : { patientId: req.user.patientId };

  const threads = await prisma.chatThread.findMany({
    where,
    include: {
      patient: { include: { user: { select: { name: true } } } },
      doctor: { include: { user: { select: { name: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  res.json(threads.map((t) => ({
    id: t.id,
    patient: { id: t.patientId, name: t.patient.user.name },
    doctor: { id: t.doctorId, name: t.doctor.user.name },
    lastMessage: t.messages[0] ?? null,
  })));
});

// Doctor creates (or fetches existing) thread with a patient
router.post('/threads', async (req, res) => {
  if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Only doctors can start a thread' });
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId is required' });

  const thread = await prisma.chatThread.upsert({
    where: { patientId_doctorId: { patientId, doctorId: req.user.doctorId } },
    update: {},
    create: { patientId, doctorId: req.user.doctorId },
  });
  res.json(thread);
});

router.get('/threads/:id/messages', async (req, res) => {
  const thread = await prisma.chatThread.findUnique({ where: { id: req.params.id } });
  if (!thread) return res.status(404).json({ error: 'Not found' });
  if (req.user.role === 'DOCTOR' && thread.doctorId !== req.user.doctorId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'PATIENT' && thread.patientId !== req.user.patientId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const messages = await prisma.chatMessage.findMany({
    where: { threadId: req.params.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

module.exports = router;
