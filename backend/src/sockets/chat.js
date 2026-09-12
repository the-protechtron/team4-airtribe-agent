const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

function setupChatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_thread', (threadId) => {
      socket.join(threadId);
    });

    socket.on('send_message', async ({ threadId, text }) => {
      if (!threadId || !text || !text.trim()) return;
      const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
      if (!thread) return;

      const user = socket.user;
      if (user.role === 'DOCTOR' && thread.doctorId !== user.doctorId) return;
      if (user.role === 'PATIENT' && thread.patientId !== user.patientId) return;

      const message = await prisma.chatMessage.create({
        data: { threadId, senderRole: user.role, text: text.trim() },
      });
      io.to(threadId).emit('new_message', message);
    });
  });
}

module.exports = setupChatSocket;
