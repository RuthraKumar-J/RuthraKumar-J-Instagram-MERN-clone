const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const {
  buildMediaUrl,
  detectMediaType,
  deleteLocalMedia,
} = require('../middleware/uploadMiddleware');
const { emitToUser } = require('../socket/socketHandler');

const populatePost = (query) =>
  query
    .populate('author', 'username fullName profilePic isVerified')
    .populate('comments.user', 'username fullName profilePic isVerified')
    .populate('comments.replies.user', 'username fullName profilePic isVerified');

const createAndEmitNotification = async ({ recipient, sender, type, post = null, text = '' }) => {
  if (!recipient || recipient.toString() === sender.toString()) return null;

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    post,
    text,
  });

  const populated = await Notification.findById(notification._id)
    .populate('sender', 'username fullName profilePic isVerified')
    .populate('post', 'mediaUrl mediaType caption');

  emitToUser(recipient, 'new_notification', populated);
  return populated;
};

// @desc    Create a new post or reel
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image or video file' });
    }

    const {
      caption = '',
      location = '',
      aspectRatio = '1:1',
      hideLikes = false,
      disableComments = false,
    } = req.body;

    const validAspect = ['1:1', '4:5', '16:9'].includes(aspectRatio) ? aspectRatio : '1:1';

    const post = await Post.create({
      author: req.user._id,
      caption,
      location,
      mediaUrl: buildMediaUrl(req, req.file),
      mediaType: detectMediaType(req.file),
      aspectRatio: validAspect,
      hideLikes: hideLikes === true || hideLikes === 'true',
      disableComments: disableComments === true || disableComments === 'true',
    });

    const populated = await populatePost(Post.findById(post._id));
    res.status(201).json({ post: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get paginated home feed (following + own posts)
// @route   GET /api/posts/feed?page=1&limit=10
// @access  Private
const getFeed = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id).select('following');
    const authorIds = [req.user._id, ...(currentUser.following || [])];

    const filter = { author: { $in: authorIds } };
    const [total, posts] = await Promise.all([
      Post.countDocuments(filter),
      populatePost(
        Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      ),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      posts,
      page,
      totalPages,
      total,
      hasMore: page < totalPages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get explore grid sorted by engagement & recency
// @route   GET /api/posts/explore?page=1&limit=18
// @access  Private
const getExplore = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 18));
    const skip = (page - 1) * limit;

    const [total, aggregated] = await Promise.all([
      Post.countDocuments(),
      Post.aggregate([
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $size: { $ifNull: ['$likes', []] } },
                { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] },
              ],
            },
          },
        },
        { $sort: { engagementScore: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id: 1 } },
      ]),
    ]);

    const orderedIds = aggregated.map((doc) => doc._id);
    const postsUnordered = await populatePost(Post.find({ _id: { $in: orderedIds } }));
    const postMap = new Map(postsUnordered.map((p) => [p._id.toString(), p]));
    const posts = orderedIds.map((id) => postMap.get(id.toString())).filter(Boolean);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      posts,
      page,
      totalPages,
      total,
      hasMore: page < totalPages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get video reels sorted newest first
// @route   GET /api/posts/reels
// @access  Private
const getReels = async (req, res, next) => {
  try {
    const reels = await populatePost(
      Post.find({ mediaType: 'video' }).sort({ createdAt: -1 })
    );
    res.json({ posts: reels });
  } catch (error) {
    next(error);
  }
};

// @desc    Get posts matching a hashtag
// @route   GET /api/posts/tag/:tag
// @access  Private
const getPostsByTag = async (req, res, next) => {
  try {
    const tag = req.params.tag.toLowerCase().replace(/^#/, '');
    const posts = await populatePost(
      Post.find({ hashtags: tag }).sort({ createdAt: -1 })
    );
    res.json({ tag, count: posts.length, posts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get posts authored by a username
// @route   GET /api/posts/user/:username
// @access  Private
const getUserPosts = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const posts = await populatePost(
      Post.find({ author: user._id }).sort({ createdAt: -1 })
    );
    res.json({ posts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's bookmarked/saved posts
// @route   GET /api/posts/saved
// @access  Private
const getSavedPosts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('savedPosts');
    const savedIds = user.savedPosts || [];
    const posts = await populatePost(
      Post.find({ _id: { $in: savedIds } }).sort({ createdAt: -1 })
    );
    res.json({ posts });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle like on a post
// @route   POST /api/posts/:id/like
// @access  Private
const toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user._id.toString();
    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(req.user._id);
      await createAndEmitNotification({
        recipient: post.author,
        sender: req.user._id,
        type: 'like',
        post: post._id,
        text: 'liked your post.',
      });
    }

    await post.save();
    res.json({
      liked: !alreadyLiked,
      likes: post.likes,
      likesCount: post.likes.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a top-level comment to a post
// @route   POST /api/posts/:id/comment
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.disableComments) {
      return res.status(403).json({ message: 'Comments are turned off for this post' });
    }

    post.comments.push({
      user: req.user._id,
      text: text.trim(),
      likes: [],
      replies: [],
    });

    await post.save();

    await createAndEmitNotification({
      recipient: post.author,
      sender: req.user._id,
      type: 'comment',
      post: post._id,
      text: `commented: "${text.trim().slice(0, 60)}"`,
    });

    const populated = await populatePost(Post.findById(post._id));
    const createdComment = populated.comments[populated.comments.length - 1];

    res.status(201).json({
      comment: createdComment,
      comments: populated.comments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a nested reply to a comment
// @route   POST /api/posts/:id/comment/:commentId/reply
// @access  Private
const addReply = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.disableComments) {
      return res.status(403).json({ message: 'Comments are turned off for this post' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.replies.push({
      user: req.user._id,
      text: text.trim(),
    });

    await post.save();

    await createAndEmitNotification({
      recipient: comment.user,
      sender: req.user._id,
      type: 'reply',
      post: post._id,
      text: `replied: "${text.trim().slice(0, 60)}"`,
    });

    const populated = await populatePost(Post.findById(post._id));
    res.status(201).json({ comments: populated.comments });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle like on a comment
// @route   POST /api/posts/:id/comment/:commentId/like
// @access  Private
const toggleCommentLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userId = req.user._id.toString();
    const alreadyLiked = comment.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      comment.likes = comment.likes.filter((id) => id.toString() !== userId);
    } else {
      comment.likes.push(req.user._id);
    }

    await post.save();
    const populated = await populatePost(Post.findById(post._id));
    res.json({
      liked: !alreadyLiked,
      comments: populated.comments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment (comment author or post owner only)
// @route   DELETE /api/posts/:id/comment/:commentId
// @access  Private
const deleteComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userId = req.user._id.toString();
    const isCommentOwner = comment.user.toString() === userId;
    const isPostOwner = post.author.toString() === userId;

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    comment.deleteOne();
    await post.save();

    const populated = await populatePost(Post.findById(post._id));
    res.json({ message: 'Comment deleted', comments: populated.comments });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle save/bookmark a post for current user
// @route   POST /api/posts/:id/save
// @access  Private
const toggleSave = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const user = await User.findById(req.user._id).select('savedPosts');
    const alreadySaved = user.savedPosts.some((id) => id.toString() === postId);

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter((id) => id.toString() !== postId);
    } else {
      user.savedPosts.push(postId);
    }

    await user.save();

    res.json({
      saved: !alreadySaved,
      savedPosts: user.savedPosts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Private
const getPostById = async (req, res, next) => {
  try {
    const post = await populatePost(Post.findById(req.params.id));
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ post });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a post (post author only)
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    deleteLocalMedia(post.mediaUrl);

    await Promise.all([
      post.deleteOne(),
      User.updateMany({ savedPosts: post._id }, { $pull: { savedPosts: post._id } }),
      Notification.deleteMany({ post: post._id }),
    ]);

    res.json({ message: 'Post deleted successfully', deletedPostId: post._id });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
