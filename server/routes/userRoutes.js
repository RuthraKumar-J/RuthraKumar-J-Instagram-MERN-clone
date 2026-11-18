const express = require('express');
const router = express.Router();
const {
  getSuggestions,
  searchUsers,
  getUserByUsername,
  updateProfile,
  updatePassword,
  toggleFollow,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(protect);

router.get('/suggestions', getSuggestions);
router.get('/search', searchUsers);
router.put('/profile', upload.single('profilePic'), updateProfile);
router.put('/password', updatePassword);
router.post('/:id/follow', toggleFollow);
router.get('/:username', getUserByUsername);

module.exports = router;

