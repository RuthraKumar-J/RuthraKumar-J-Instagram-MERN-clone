const express = require('express');
const router = express.Router();
const {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(protect);

router.get('/conversations', getConversations);
router.post('/conversations', createOrGetConversation);
router.get('/:conversationId', getMessages);
router.post('/:conversationId', upload.single('media'), sendMessage);

module.exports = router;

