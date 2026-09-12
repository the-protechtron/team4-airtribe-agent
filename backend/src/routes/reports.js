const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const REPORT_SELECT = {
  id: true, patientId: true, conversationId: true, doctorId: true,
  summaryJson: true, urgencyLevel: true, reviewStatus: true, nextAction: true, createdAt: true,
};

function canAccessReport(user, report) {
  if (user.role === 'DOCTOR') return true;
  if (user.role === 'PATIENT') return report.patientId === user.patientId;
  return false;
}

router.get('/patient/:patientId', async (req, res) => {
  if (req.user.role === 'PATIENT' && req.user.patientId !== req.params.patientId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const reports = await prisma.report.findMany({
    where: { patientId: req.params.patientId },
    orderBy: { createdAt: 'desc' },
    select: REPORT_SELECT,
  });
  res.json(reports);
});

router.get('/:id', async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id }, select: REPORT_SELECT });
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (!canAccessReport(req.user, report)) return res.status(403).json({ error: 'Forbidden' });
  res.json(report);
});

router.get('/:id/pdf', async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (!canAccessReport(req.user, report)) return res.status(403).json({ error: 'Forbidden' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}.pdf"`);
  res.send(Buffer.from(report.pdfData));
});

router.patch('/:id', async (req, res) => {
  if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Forbidden' });
  const { reviewStatus, nextAction, claim } = req.body;
  const data = {};
  if (reviewStatus) data.reviewStatus = reviewStatus;
  if (nextAction) data.nextAction = nextAction;
  if (claim) data.doctorId = req.user.doctorId;
  const report = await prisma.report.update({ where: { id: req.params.id }, data, select: REPORT_SELECT });
  res.json(report);
});

module.exports = router;
