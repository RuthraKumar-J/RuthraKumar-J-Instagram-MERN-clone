require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Post = require('./models/Post');
const Story = require('./models/Story');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const Notification = require('./models/Notification');

const PORT = process.env.PORT || 5000;
const SEED_MEDIA_BASE =
  process.env.SEED_MEDIA_BASE || `http://localhost:${PORT}/uploads/seed`;
const asset = (file) => `${SEED_MEDIA_BASE}/${file}`;

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Story.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    console.log('Creating users...');
    const userDocs = [
      {
        username: 'ruthrakumar.j',
        fullName: 'Ruthrakumar J',
        email: 'ruthrakumar.j@instagram.com',
        password: 'password123',
        bio: 'Product designer & weekend photographer. Capturing light, city lines, and espresso.',
        website: 'https://ruthrakumar.dev',
        profilePic: asset('ruthrakumar.png'),
        isVerified: true,
      },
      {
        username: 'elena_rodriguez',
        fullName: 'Elena Rodriguez',
        email: 'elena@instagram.com',
        password: 'password123',
        bio: 'Travel photographer chasing golden hour across 40+ countries. Prints available below.',
        website: 'https://elenalens.co',
        profilePic: asset('avatar-elena.jpg'),
        isVerified: true,
      },
      {
        username: 'marcus_chen',
        fullName: 'Marcus Chen',
        email: 'marcus@instagram.com',
        password: 'password123',
        bio: 'Architect, filmmaker & urban minimalist. Concrete, glass, and motion.',
        website: 'https://marcuschen.studio',
        profilePic: asset('avatar-marcus.jpg'),
        isVerified: true,
      },
      {
        username: 'sofia_patel',
        fullName: 'Sofia Patel',
        email: 'sofia@instagram.com',
        password: 'password123',
        bio: 'Specialty coffee roaster & recipe creator. Pour-over rituals & seasonal plates.',
        website: 'https://sofiabrews.com',
        profilePic: asset('avatar-sofia.jpg'),
        isVerified: false,
      },
      {
        username: 'liam_brooks',
        fullName: 'Liam Brooks',
        email: 'liam@instagram.com',
        password: 'password123',
        bio: 'Trail runner, alpine climber & full-stack maker. Always planning the next summit.',
        website: 'https://liambrooks.io',
        profilePic: asset('avatar-liam.jpg'),
        isVerified: false,
      },
      {
        username: 'maya_lin',
        fullName: 'Maya Lin',
        email: 'maya@instagram.com',
        password: 'password123',
        bio: 'Visual artist & street photographer based in Tokyo and San Francisco.',
        website: 'https://mayalin.art',
        profilePic: asset('avatar-maya.jpg'),
        isVerified: true,
      },
    ];

    const users = [];
    for (const data of userDocs) {
      const created = await User.create(data);
      users.push(created);
    }

    const [demo, elena, marcus, sofia, liam, maya] = users;

    // Mutual follow graph (leave liam & maya unfollowed by demo_user so suggestions rail shines)
    const followPairs = [
      [demo, elena],
      [demo, marcus],
      [demo, sofia],
      [elena, demo],
      [elena, marcus],
      [elena, maya],
      [elena, liam],
      [marcus, demo],
      [marcus, elena],
      [marcus, maya],
      [sofia, demo],
      [sofia, elena],
      [sofia, liam],
      [liam, demo],
      [liam, elena],
      [liam, maya],
      [maya, elena],
      [maya, marcus],
      [maya, liam],
    ];

    for (const [follower, target] of followPairs) {
      follower.following.push(target._id);
      target.followers.push(follower._id);
    }

    await Promise.all(users.map((u) => u.save()));

    console.log('Creating 15 posts & reels...');
    const now = Date.now();
    const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000);

    const postSeeds = [
      {
        author: elena._id,
        caption:
          'Golden hour over the Dolomites never misses. Worth the 4 AM ridge hike! #travel #photography #mountains #sunset',
        mediaUrl: asset('post-dolomites.jpg'),
        mediaType: 'image',
        aspectRatio: '4:5',
        location: 'Dolomites, Italy',
        likes: [demo._id, marcus._id, sofia._id, liam._id, maya._id],
        comments: [
          {
            user: demo._id,
            text: 'The reflection on that lake is unreal! What lens did you pack?',
            likes: [elena._id, marcus._id],
            replies: [
              {
                user: elena._id,
                text: '@ruthrakumar.j 24-70mm f/2.8 at 35mm! Still my favorite hiking lens.',
                createdAt: hoursAgo(1.5),
              },
            ],
            createdAt: hoursAgo(2),
          },
          {
            user: marcus._id,
            text: 'Framing is spot on. Need to book a flight soon.',
            likes: [elena._id],
            replies: [],
            createdAt: hoursAgo(1),
          },
        ],
        createdAt: hoursAgo(3),
      },
      {
        author: marcus._id,
        caption:
          'Morning shadows cutting across brutalist concrete. Pure geometry. #architecture #minimalism #design',
        mediaUrl: asset('post-architecture.jpg'),
        mediaType: 'image',
        aspectRatio: '1:1',
        location: 'Zurich, Switzerland',
        likes: [demo._id, elena._id, maya._id],
        comments: [
          {
            user: maya._id,
            text: 'Those leading lines are perfection.',
            likes: [marcus._id],
            replies: [],
            createdAt: hoursAgo(4),
          },
        ],
        createdAt: hoursAgo(5),
      },
      {
        author: demo._id,
        caption:
          'Desk setup dialed in for a deep design sprint today. Warm light + mechanical switches. #design #minimalism #workspace',
        mediaUrl: asset('post-workspace.jpg'),
        mediaType: 'image',
        aspectRatio: '16:9',
        location: 'San Francisco, CA',
        likes: [elena._id, marcus._id, sofia._id, liam._id],
        comments: [
          {
            user: sofia._id,
            text: 'Only missing a fresh cortado on the right corner!',
            likes: [demo._id],
            replies: [
              {
                user: demo._id,
                text: '@sofia_patel Already finished cup #2 before taking this photo haha',
                createdAt: hoursAgo(6),
              },
            ],
            createdAt: hoursAgo(6.5),
          },
        ],
        createdAt: hoursAgo(8),
      },
      {
        author: sofia._id,
        caption:
          'Slow Sunday pour-over ritual with washed Ethiopian beans. Notes of bergamot and jasmine. #coffee #morning #lifestyle',
        mediaUrl: asset('post-coffee.jpg'),
        mediaType: 'image',
        aspectRatio: '4:5',
        location: 'Portland, OR',
        likes: [demo._id, elena._id, maya._id],
        comments: [
          {
            user: elena._id,
            text: 'Save me a bag of that roast please!',
            likes: [sofia._id],
            replies: [],
            createdAt: hoursAgo(9),
          },
        ],
        createdAt: hoursAgo(11),
      },
      {
        author: marcus._id,
        caption:
          'Chasing nature in motion — macro bloom reel test from the weekend shoot! #reels #filmmaking #cinema #nature',
        mediaUrl: asset('reel-flower.mp4'),
        mediaType: 'video',
        aspectRatio: '16:9',
        location: 'Los Angeles, CA',
        likes: [demo._id, elena._id, sofia._id, liam._id, maya._id],
        comments: [
          {
            user: liam._id,
            text: 'Color grade looks super crisp!',
            likes: [marcus._id],
            replies: [],
            createdAt: hoursAgo(12),
          },
        ],
        createdAt: hoursAgo(14),
      },
      {
        author: elena._id,
        caption:
          'Ocean mist rolling into Big Sur right before dusk. #nature #travel #ocean #sunset',
        mediaUrl: asset('post-bigsur.jpg'),
        mediaType: 'image',
        aspectRatio: '1:1',
        location: 'Big Sur, California',
        likes: [demo._id, sofia._id, liam._id],
        comments: [],
        createdAt: hoursAgo(18),
      },
      {
        author: liam._id,
        caption:
          '20km trail loop above the clouds. Nothing resets the mind faster than alpine air. #nature #running #mountains #adventure',
        mediaUrl: asset('post-banff.jpg'),
        mediaType: 'image',
        aspectRatio: '4:5',
        location: 'Banff National Park',
        likes: [elena._id, sofia._id, maya._id, demo._id],
        comments: [
          {
            user: elena._id,
            text: 'That elevation gain looks brutal and totally worth it!',
            likes: [liam._id],
            replies: [],
            createdAt: hoursAgo(20),
          },
        ],
        createdAt: hoursAgo(22),
      },
      {
        author: maya._id,
        caption:
          'Neon reflections after midnight rain in Shibuya. #streetphotography #tokyo #photography #night',
        mediaUrl: asset('post-shibuya.jpg'),
        mediaType: 'image',
        aspectRatio: '4:5',
        location: 'Shibuya, Tokyo',
        likes: [elena._id, marcus._id, liam._id, demo._id],
        comments: [
          {
            user: marcus._id,
            text: 'Blade Runner vibes all the way.',
            likes: [maya._id],
            replies: [],
            createdAt: hoursAgo(25),
          },
        ],
        createdAt: hoursAgo(27),
      },
      {
        author: elena._id,
        caption:
          'Weekend escape reel — turn sound on and enjoy this classic animation clip. #reels #travel #adventure #nature',
        mediaUrl: asset('reel-bunny.mp4'),
        mediaType: 'video',
        aspectRatio: '16:9',
        location: 'Reykjavik, Iceland',
        likes: [demo._id, marcus._id, sofia._id, maya._id],
        comments: [
          {
            user: demo._id,
            text: 'Instant smile!',
            likes: [elena._id],
            replies: [],
            createdAt: hoursAgo(28),
          },
        ],
        createdAt: hoursAgo(30),
      },
      {
        author: sofia._id,
        caption:
          'Freshly baked sourdough focaccia with rosemary, flaky sea salt, and roasted garlic. #food #baking #coffee',
        mediaUrl: asset('post-sourdough.jpg'),
        mediaType: 'image',
        aspectRatio: '1:1',
        location: 'Portland, OR',
        likes: [demo._id, elena._id, liam._id],
        comments: [],
        createdAt: hoursAgo(36),
      },
      {
        author: demo._id,
        caption:
          'Late afternoon walk across the Golden Gate overlook. Always grateful for this coastline. #photography #sunset #travel',
        mediaUrl: asset('post-goldengate.jpg'),
        mediaType: 'image',
        aspectRatio: '4:5',
        location: 'San Francisco, CA',
        likes: [elena._id, marcus._id, sofia._id, maya._id],
        comments: [
          {
            user: elena._id,
            text: 'Classic SF glow! Love the warm tones.',
            likes: [demo._id],
            replies: [],
            createdAt: hoursAgo(40),
          },
        ],
        createdAt: hoursAgo(42),
      },
      {
        author: maya._id,
        caption:
          'Minimal ceramic forms and soft studio daylight. #design #minimalism #art',
        mediaUrl: asset('post-ceramics.jpg'),
        mediaType: 'image',
        aspectRatio: '1:1',
        location: 'Kyoto, Japan',
        likes: [marcus._id, sofia._id, elena._id],
        comments: [],
        createdAt: hoursAgo(48),
      },
      {
        author: demo._id,
        caption:
          'Wildlife sighting reel from the northern trail — caught this bear right by the river. #reels #adventure #travel #nature',
        mediaUrl: asset('reel-bear.mp4'),
        mediaType: 'video',
        aspectRatio: '16:9',
        location: 'Highway 1, California',
        likes: [elena._id, marcus._id, liam._id],
        comments: [
          {
            user: marcus._id,
            text: 'Smooth cuts! What gimbal are you using?',
            likes: [demo._id],
            replies: [],
            createdAt: hoursAgo(50),
          },
        ],
        createdAt: hoursAgo(54),
      },
      {
        author: liam._id,
        caption:
          'Campfire glow under a million stars. Zero cell service, 100% recharge. #adventure #nature #camping',
        mediaUrl: asset('post-camping.jpg'),
        mediaType: 'image',
        aspectRatio: '1:1',
        location: 'Yosemite Valley',
        likes: [elena._id, sofia._id, maya._id, marcus._id],
        comments: [],
        createdAt: hoursAgo(62),
      },
      {
        author: marcus._id,
        caption:
          'Symmetry inside the new museum atrium. Light shifts every 15 minutes here. #architecture #photography #design',
        mediaUrl: asset('post-museum.jpg'),
        mediaType: 'image',
        aspectRatio: '4:5',
        location: 'Copenhagen, Denmark',
        likes: [demo._id, elena._id, maya._id],
        comments: [],
        createdAt: hoursAgo(72),
      },
    ];

    const posts = [];
    for (const seed of postSeeds) {
      const created = await Post.create(seed);
      posts.push(created);
    }

    // Bookmark 3 posts for demo_user
    demo.savedPosts = [posts[0]._id, posts[1]._id, posts[3]._id];
    await demo.save();

    console.log('Creating 4 active 24h stories...');
    const expiresIn24h = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

    await Story.create([
      {
        author: demo._id,
        mediaUrl: asset('story-demo.jpg'),
        mediaType: 'image',
        overlayText: 'Shipping new features today!',
        viewers: [
          { user: elena._id, viewedAt: hoursAgo(1) },
          { user: marcus._id, viewedAt: hoursAgo(0.5) },
        ],
        expiresAt: expiresIn24h(),
      },
      {
        author: elena._id,
        mediaUrl: asset('story-elena.jpg'),
        mediaType: 'image',
        overlayText: 'Alpine sunrise check-in',
        viewers: [{ user: marcus._id, viewedAt: hoursAgo(1) }],
        expiresAt: expiresIn24h(),
      },
      {
        author: marcus._id,
        mediaUrl: asset('story-marcus.jpg'),
        mediaType: 'image',
        overlayText: 'Downtown light study',
        viewers: [{ user: demo._id, viewedAt: hoursAgo(2) }],
        expiresAt: expiresIn24h(),
      },
      {
        author: sofia._id,
        mediaUrl: asset('story-sofia.jpg'),
        mediaType: 'image',
        overlayText: 'Morning latte art practice',
        viewers: [],
        expiresAt: expiresIn24h(),
      },
    ]);

    console.log('Creating 2 DM conversations...');
    const conv1 = await Conversation.create({
      participants: [demo._id, elena._id],
    });

    await Message.create({
      conversationId: conv1._id,
      sender: elena._id,
      text: 'Hey Ruthrakumar! Loved your latest desk setup shot.',
      seenBy: [elena._id, demo._id],
      createdAt: hoursAgo(4),
    });

    await Message.create({
      conversationId: conv1._id,
      sender: demo._id,
      text: 'Thanks Elena! Your Dolomites photo completely blew me away.',
      seenBy: [demo._id, elena._id],
      createdAt: hoursAgo(3.5),
    });

    const c1m3 = await Message.create({
      conversationId: conv1._id,
      sender: elena._id,
      text: 'Check out this shot from the ridge!',
      sharedPost: posts[0]._id,
      seenBy: [elena._id],
      createdAt: hoursAgo(1),
    });

    conv1.lastMessage = c1m3._id;
    await conv1.save();

    const conv2 = await Conversation.create({
      participants: [demo._id, marcus._id],
    });

    await Message.create({
      conversationId: conv2._id,
      sender: marcus._id,
      text: 'Are we still on for the photo walk this Saturday morning?',
      seenBy: [marcus._id, demo._id],
      createdAt: hoursAgo(6),
    });

    const c2m2 = await Message.create({
      conversationId: conv2._id,
      sender: demo._id,
      text: '100%! Let us meet near the Ferry Building at 7:30 AM for soft light.',
      seenBy: [demo._id, marcus._id],
      createdAt: hoursAgo(5.5),
    });

    conv2.lastMessage = c2m2._id;
    await conv2.save();

    console.log('Creating sample notifications...');
    await Notification.create([
      {
        recipient: demo._id,
        sender: elena._id,
        type: 'like',
        post: posts[2]._id,
        text: 'liked your post.',
        isRead: false,
        createdAt: hoursAgo(0.5),
      },
      {
        recipient: demo._id,
        sender: sofia._id,
        type: 'comment',
        post: posts[2]._id,
        text: 'commented: "Only missing a fresh cortado on the right corner!"',
        isRead: false,
        createdAt: hoursAgo(2),
      },
      {
        recipient: demo._id,
        sender: liam._id,
        type: 'follow',
        post: null,
        text: 'started following you.',
        isRead: false,
        createdAt: hoursAgo(4),
      },
      {
        recipient: demo._id,
        sender: marcus._id,
        type: 'like',
        post: posts[10]._id,
        text: 'liked your post.',
        isRead: true,
        createdAt: hoursAgo(12),
      },
    ]);

    console.log('Seed completed successfully!');
    console.log(
      'Demo credentials -> username: ruthrakumar.j | email: ruthrakumar.j@instagram.com | password: password123'
    );
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedDatabase();
