const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const formatAuthUser = (user) => ({
  _id: user._id,
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  bio: user.bio,
  website: user.website,
  profilePic: user.profilePic,
  isVerified: user.isVerified,
  followers: user.followers,
  following: user.following,
  savedPosts: user.savedPosts,
  createdAt: user.createdAt,
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { username, fullName, email, password } = req.body;

    if (!username || !fullName || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, full name, email, and password' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[a-z0-9._]+$/.test(normalizedUsername)) {
      return res.status(400).json({
        message: 'Username can only contain lowercase letters, numbers, periods, and underscores',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      const conflictField =
        existingUser.email === normalizedEmail ? 'email address' : 'username';
      return res.status(409).json({ message: `This ${conflictField} is already taken` });
    }

    const user = await User.create({
      username: normalizedUsername,
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
    });

    const token = generateToken(user._id);
    res.status(201).json({
      user: formatAuthUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user by email or username
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { identifier, email, username, password } = req.body;
    const loginKey = (identifier || email || username || '').trim().toLowerCase();

    if (!loginKey || !password) {
      return res.status(400).json({ message: 'Please enter your email/username and password' });
    }

    const user = await User.findOne({
      $or: [{ email: loginKey }, { username: loginKey }],
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials. Please check your login details.' });
    }

    const token = generateToken(user._id);
    res.json({
      user: formatAuthUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: formatAuthUser(user) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};

