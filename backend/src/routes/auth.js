const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const router = express.Router();

function signToken(user, patientId, doctorId) {
  return jwt.sign(
    { sub: user.id, role: user.role, patientId, doctorId },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function publicUser(user, patient, doctor) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    patientId: patient?.id,
    doctorId: doctor?.id,
  };
}

router.post('/register', async (req, res) => {
  const { role, name, email, password, phone, age, gender, village, languagePref, specialization } = req.body;
  if (!role || !name || !email || !password) {
    return res.status(400).json({ error: 'role, name, email, password are required' });
  }
  if (role !== 'PATIENT' && role !== 'DOCTOR') {
    return res.status(400).json({ error: 'role must be PATIENT or DOCTOR' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { role, name, email, passwordHash, phone } });

  let patient = null;
  let doctor = null;
  if (role === 'PATIENT') {
    patient = await prisma.patient.create({ data: { userId: user.id, age, gender, village, languagePref } });
  } else {
    doctor = await prisma.doctor.create({ data: { userId: user.id, specialization } });
  }

  const token = signToken(user, patient?.id, doctor?.id);
  res.status(201).json({ token, user: publicUser(user, patient, doctor) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = await prisma.user.findUnique({ where: { email }, include: { patient: true, doctor: true } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user, user.patient?.id, user.doctor?.id);
  res.json({ token, user: publicUser(user, user.patient, user.doctor) });
});

module.exports = router;
