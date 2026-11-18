const Story = require('../models/Story');
const User = require('../models/User');
const {
  buildMediaUrl,
  detectMediaType,
  deleteLocalMedia,
} = require('../middleware/uploadMiddleware');

// @desc    Create a new 24h story
// @route   POST /api/stories
// @access  Private
const createStory = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image or video for your story' });
    }

    const { overlayText = '' } = req.body;

    const story = await Story.create({
      author: req.user._id,
      mediaUrl: buildMediaUrl(req, req.file),
      mediaType: detectMediaType(req.file),
      overlayText: overlayText.trim().slice(0, 200),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const populated = await Story.findById(story._id)
      .populate('author', 'username fullName profilePic isVerified')
      .populate('viewers.user', 'username fullName profilePic isVerified');

    res.status(201).json({ story: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active non-expired stories grouped by author
// @route   GET /api/stories/feed
// @access  Private
const getStoriesFeed = async (req, res, next) => {
  try {
    const currentUserId = req.user._id.toString();
    const currentUser = await User.findById(req.user._id).select('following');
    const authorIds = [req.user._id, ...(currentUser.following || [])];

    const activeStories = await Story.find({
      author: { $in: authorIds },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .populate('author', 'username fullName profilePic isVerified')
      .populate('viewers.user', 'username fullName profilePic isVerified');

    const groupMap = new Map();

    activeStories.forEach((story) => {
      if (!story.author) return;
      const authorId = story.author._id.toString();
      const isViewedByCurrent = story.viewers.some(
        (v) => v.user && v.user._id.toString() === currentUserId
      );

      if (!groupMap.has(authorId)) {
        groupMap.set(authorId, {
          author: story.author,
          stories: [],
          hasUnseen: false,
          allViewed: true,
          latestAt: story.createdAt,
        });
      }

      const group = groupMap.get(authorId);
      group.stories.push({
        ...story.toObject(),
        isViewed: isViewedByCurrent,
      });

      if (!isViewedByCurrent) {
        group.hasUnseen = true;
        group.allViewed = false;
      }
      if (story.createdAt > group.latestAt) {
        group.latestAt = story.createdAt;
      }
    });

    const groups = Array.from(groupMap.values()).sort((a, b) => {
      const aIsSelf = a.author._id.toString() === currentUserId;
      const bIsSelf = b.author._id.toString() === currentUserId;
      if (aIsSelf && !bIsSelf) return -1;
      if (!aIsSelf && bIsSelf) return 1;
      if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
      return new Date(b.latestAt) - new Date(a.latestAt);
    });

    res.json({ storyGroups: groups });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a story as viewed by current user
// @route   POST /api/stories/:id/view
// @access  Private
const viewStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: 'Story not found or expired' });
    }

    const userId = req.user._id.toString();
    const alreadyViewed = story.viewers.some((v) => v.user.toString() === userId);

    if (!alreadyViewed) {
      story.viewers.push({ user: req.user._id, viewedAt: new Date() });
      await story.save();
    }

    const populated = await Story.findById(story._id).populate(
      'viewers.user',
      'username fullName profilePic isVerified'
    );

    res.json({ viewers: populated.viewers });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a story (author only)
// @route   DELETE /api/stories/:id
// @access  Private
const deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }

    deleteLocalMedia(story.mediaUrl);
    await story.deleteOne();

    res.json({ message: 'Story deleted', deletedStoryId: story._id });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStory,
  getStoriesFeed,
  viewStory,
  deleteStory,
};

