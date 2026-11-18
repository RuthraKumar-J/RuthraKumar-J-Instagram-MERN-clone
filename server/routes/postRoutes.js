const express = require('express');
const router = express.Router();
const {
  createPost,
  getFeed,
  getExplore,
  getReels,
  getPostsByTag,
  getUserPosts,
  getSavedPosts,
  getPostById,
  toggleLike,
  addComment,
  addReply,
  toggleCommentLike,
  deleteComment,
  toggleSave,
  deletePost,
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(protect);

router.post('/', upload.single('media'), createPost);
router.get('/feed', getFeed);
router.get('/explore', getExplore);
router.get('/reels', getReels);
router.get('/saved', getSavedPosts);
router.get('/tag/:tag', getPostsByTag);
router.get('/user/:username', getUserPosts);
router.get('/:id', getPostById);
router.post('/:id/like', toggleLike);
router.post('/:id/comment', addComment);
router.post('/:id/comment/:commentId/reply', addReply);
router.post('/:id/comment/:commentId/like', toggleCommentLike);
router.delete('/:id/comment/:commentId', deleteComment);
router.post('/:id/save', toggleSave);
router.delete('/:id', deletePost);

module.exports = router;

