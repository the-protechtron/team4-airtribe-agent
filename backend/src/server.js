require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const reportRoutes = require('./routes/reports');
const chatRoutes = require('./routes/chat');
const setupChatSocket = require('./sockets/chat');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/patients', patientRoutes);
app.use('/doctors', doctorRoutes);
app.use('/reports', reportRoutes);
app.use('/chat', chatRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_ORIGIN || '*' } });
setupChatSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`arogyavaani AI backend listening on port ${PORT}`));
