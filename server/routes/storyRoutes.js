const express = require('express');
const router = express.Router();
const {
  createStory,
  getStoriesFeed,
  viewStory,
  deleteStory,
} = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(protect);

router.post('/', upload.single('media'), createStory);
router.get('/feed', getStoriesFeed);
router.post('/:id/view', viewStory);
router.delete('/:id', deleteStory);

module.exports = router;

