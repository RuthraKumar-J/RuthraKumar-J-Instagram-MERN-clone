const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

let ioInstance = null;
// Map<userId, Set<socketId>> to support multiple tabs per user
const onlineUsers = new Map();

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId.toString()}`).emit(event, payload);
};

const emitToConversation = (conversationId, event, payload) => {
  if (!ioInstance || !conversationId) return;
  ioInstance.to(`conversation:${conversationId.toString()}`).emit(event, payload);
};

const initSocket = (io) => {
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication error: missing token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id username fullName profilePic');
      if (!user) {
        return next(new Error('Authentication error: user not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    socket.join(`user:${userId}`);
    io.emit('online_users', getOnlineUserIds());

    socket.on('join_conversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing', {
        conversationId,
        userId,
        username: socket.user.username,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('stop_typing', {
        conversationId,
        userId,
      });
    });

    socket.on('send_message', async ({ conversationId, text = '', sharedPost = null, mediaUrl = '' }, callback) => {
      try {
        if (!conversationId) return;
        const trimmedText = typeof text === 'string' ? text.trim() : '';
        if (!trimmedText && !sharedPost && !mediaUrl) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isParticipant) return;

        const message = await Message.create({
          conversationId,
          sender: userId,
          text: trimmedText,
          sharedPost: sharedPost || null,
          mediaUrl: mediaUrl || '',
          seenBy: [userId],
        });

        conversation.lastMessage = message._id;
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username fullName profilePic isVerified')
          .populate({
            path: 'sharedPost',
            select: 'mediaUrl mediaType caption author',
            populate: { path: 'author', select: 'username fullName profilePic isVerified' },
          });

        conversation.participants.forEach((participantId) => {
          emitToUser(participantId, 'message_received', {
            conversationId,
            message: populatedMessage,
          });
        });

        if (typeof callback === 'function') {
          callback({ ok: true, message: populatedMessage });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ ok: false, error: err.message });
        }
      }
    });

    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      io.emit('online_users', getOnlineUserIds());
    });
  });
};

module.exports = {
  initSocket,
  emitToUser,
  emitToConversation,
  getOnlineUserIds,
};

