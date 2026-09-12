const express = require('express');
const prisma = require('../lib/prisma');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const doctors = await prisma.doctor.findMany({ include: { user: { select: { name: true } } } });
  res.json(doctors.map((d) => ({ id: d.id, name: d.user.name, specialization: d.specialization })));
});

router.get('/me', async (req, res) => {
  if (req.user.role !== 'DOCTOR') return res.status(403).json({ error: 'Forbidden' });
  const doctor = await prisma.doctor.findUnique({
    where: { id: req.user.doctorId },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });
  res.json(doctor);
});

module.exports = router;
