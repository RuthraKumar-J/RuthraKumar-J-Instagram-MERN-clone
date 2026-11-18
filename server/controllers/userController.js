const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { buildMediaUrl, deleteLocalMedia } = require('../middleware/uploadMiddleware');
const { emitToUser } = require('../socket/socketHandler');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get top 5 suggested users not currently followed
// @route   GET /api/users/suggestions
// @access  Private
const getSuggestions = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user._id).select('following');
    const excludedIds = [
      new mongoose.Types.ObjectId(req.user._id),
      ...(currentUser.following || []).map((id) => new mongoose.Types.ObjectId(id)),
    ];

    const suggestions = await User.aggregate([
      { $match: { _id: { $nin: excludedIds } } },
      {
        $addFields: {
          followersCount: { $size: { $ifNull: ['$followers', []] } },
        },
      },
      { $sort: { followersCount: -1, createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          username: 1,
          fullName: 1,
          profilePic: 1,
          isVerified: 1,
          bio: 1,
          followers: 1,
          followersCount: 1,
        },
      },
    ]);

    res.json({ users: suggestions });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users by username or fullName
// @route   GET /api/users/search?q=
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.json({ users: [] });
    }

    const regex = new RegExp(escapeRegex(query), 'i');
    const users = await User.find({
      $or: [{ username: regex }, { fullName: regex }],
    })
      .select('username fullName profilePic isVerified followers bio')
      .limit(15)
      .lean();

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile by username
// @route   GET /api/users/:username
// @access  Private
const getUserByUsername = async (req, res, next) => {
  try {
    const username = req.params.username.toLowerCase();
    const user = await User.findOne({ username })
      .select('-password')
      .populate('followers', 'username fullName profilePic isVerified')
      .populate('following', 'username fullName profilePic isVerified');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const postsCount = await Post.countDocuments({ author: user._id });

    res.json({
      user: {
        ...user.toObject(),
        postsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user's profile (including profilePic)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { fullName, username, bio, website } = req.body;

    if (typeof username === 'string' && username.trim()) {
      const normalized = username.trim().toLowerCase();
      if (!/^[a-z0-9._]+$/.test(normalized)) {
        return res.status(400).json({
          message: 'Username may only contain lowercase letters, numbers, periods, and underscores',
        });
      }
      if (normalized !== user.username) {
        const taken = await User.findOne({ username: normalized, _id: { $ne: user._id } });
        if (taken) {
          return res.status(409).json({ message: 'This username is already taken' });
        }
        user.username = normalized;
      }
    }

    if (typeof fullName === 'string' && fullName.trim()) {
      user.fullName = fullName.trim();
    }

    if (typeof bio === 'string') {
      if (bio.length > 150) {
        return res.status(400).json({ message: 'Bio cannot exceed 150 characters' });
      }
      user.bio = bio;
    }

    if (typeof website === 'string') {
      user.website = website.trim();
    }

    if (req.file) {
      const oldPic = user.profilePic;
      user.profilePic = buildMediaUrl(req, req.file);
      if (oldPic && oldPic.includes('/uploads/')) {
        deleteLocalMedia(oldPic);
      }
    }

    await user.save();

    const sanitized = await User.findById(user._id).select('-password');
    res.json({ user: sanitized });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user's password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle follow / unfollow user
// @route   POST /api/users/:id/follow
// @access  Private
const toggleFollow = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const currentUserId = req.user._id.toString();

    if (targetId === currentUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetId).select('_id followers');
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const alreadyFollowing = targetUser.followers.some(
      (id) => id.toString() === currentUserId
    );

    if (alreadyFollowing) {
      await Promise.all([
        User.updateOne({ _id: currentUserId }, { $pull: { following: targetId } }),
        User.updateOne({ _id: targetId }, { $pull: { followers: currentUserId } }),
      ]);
      return res.json({
        following: false,
        message: 'Unfollowed user',
      });
    }

    await Promise.all([
      User.updateOne({ _id: currentUserId }, { $addToSet: { following: targetId } }),
      User.updateOne({ _id: targetId }, { $addToSet: { followers: currentUserId } }),
    ]);

    const notification = await Notification.create({
      recipient: targetId,
      sender: currentUserId,
      type: 'follow',
      text: 'started following you.',
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'username fullName profilePic isVerified')
      .populate('post', 'mediaUrl mediaType caption');

    emitToUser(targetId, 'new_notification', populatedNotification);

    res.json({
      following: true,
      message: 'Followed user',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuggestions,
  searchUsers,
  getUserByUsername,
  updateProfile,
  updatePassword,
  toggleFollow,
};

