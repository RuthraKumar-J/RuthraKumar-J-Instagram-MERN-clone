const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Reply text is required'],
      trim: true,
      maxlength: [1000, 'Reply cannot exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    replies: [replySchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    caption: {
      type: String,
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
      default: '',
    },
    hashtags: {
      type: [String],
      lowercase: true,
      index: true,
      default: [],
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media URL is required'],
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    aspectRatio: {
      type: String,
      enum: ['1:1', '4:5', '16:9'],
      default: '1:1',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    hideLikes: {
      type: Boolean,
      default: false,
    },
    disableComments: {
      type: Boolean,
      default: false,
    },
    comments: [commentSchema],
  },
  {
    timestamps: true,
  }
);

postSchema.pre('save', function parseHashtags(next) {
  if (this.isModified('caption') || this.isNew) {
    const matches = [...(this.caption || '').matchAll(/#(\w+)/g)];
    const uniqueTags = [...new Set(matches.map((m) => m[1].toLowerCase()))];
    this.hashtags = uniqueTags;
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);

