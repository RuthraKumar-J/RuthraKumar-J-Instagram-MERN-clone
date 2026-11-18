const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Post = require('../models/Post');
const { buildMediaUrl } = require('../middleware/uploadMiddleware');
const { emitToUser } = require('../socket/socketHandler');

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username fullName profilePic isVerified')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username fullName profilePic',
        },
      });

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: userId },
          seenBy: { $ne: userId },
        });
        return {
          ...conv.toObject(),
          unreadCount,
        };
      })
    );

    res.json({ conversations: conversationsWithUnread });
  } catch (error) {
    next(error);
  }
};

// @desc    Find or create a 1-on-1 conversation
// @route   POST /api/messages/conversations
// @access  Private
const createOrGetConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id.toString();

    if (!recipientId) {
      return res.status(400).json({ message: 'recipientId is required' });
    }

    if (recipientId === currentUserId) {
      return res.status(400).json({ message: 'Cannot start a conversation with yourself' });
    }

    const recipient = await User.findById(recipientId).select('_id');
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, recipientId], $size: 2 },
    })
      .populate('participants', 'username fullName profilePic isVerified')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username fullName profilePic' },
      });

    if (!conversation) {
      const created = await Conversation.create({
        participants: [currentUserId, recipientId],
      });
      conversation = await Conversation.findById(created._id).populate(
        'participants',
        'username fullName profilePic isVerified'
      );
    }

    res.status(200).json({ conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a conversation and mark unseen as seen
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to access this conversation' });
    }

    const unseenUpdate = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        seenBy: { $ne: userId },
      },
      {
        $addToSet: { seenBy: userId },
      }
    );

    if (unseenUpdate.modifiedCount > 0) {
      conversation.participants.forEach((participantId) => {
        if (participantId.toString() !== userId.toString()) {
          emitToUser(participantId, 'messages_seen', {
            conversationId,
            seenBy: userId.toString(),
          });
        }
      });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username fullName profilePic isVerified')
      .populate({
        path: 'sharedPost',
        select: 'mediaUrl mediaType caption author',
        populate: { path: 'author', select: 'username fullName profilePic isVerified' },
      });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message (text, image attachment, or shared post)
// @route   POST /api/messages/:conversationId
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { text = '', sharedPost = null } = req.body;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to message in this conversation' });
    }

    const mediaUrl = req.file ? buildMediaUrl(req, req.file) : '';
    const trimmedText = typeof text === 'string' ? text.trim() : '';

    if (!trimmedText && !mediaUrl && !sharedPost) {
      return res.status(400).json({ message: 'Message must include text, media, or a shared post' });
    }

    let validSharedPost = null;
    if (sharedPost) {
      const exists = await Post.exists({ _id: sharedPost });
      if (!exists) {
        return res.status(404).json({ message: 'Shared post not found' });
      }
      validSharedPost = sharedPost;
    }

    const message = await Message.create({
      conversationId,
      sender: userId,
      text: trimmedText,
      mediaUrl,
      sharedPost: validSharedPost,
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

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
};

