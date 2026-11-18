# Instagram Clone — Full-Stack MERN + Socket.io + Tailwind CSS

A production-grade Instagram clone built with MongoDB, Express.js, React (Vite), Node.js, Socket.io, and Tailwind CSS. Includes JWT authentication, real-time direct messaging & notifications, 24-hour TTL stories, vertical snap-scrolling Reels, hashtag discovery, bookmarks, dark/light mode, and local multipart media uploads.

## Monorepo Structure

```text
instagram-mern/
├── README.md
├── server/          # Express REST API, Mongoose models, Multer uploads, Socket.io
└── client/          # React 18 + Vite + Tailwind CSS SPA
```

## Quick Start

### 1. Prerequisites
- Node.js v18+
- MongoDB running locally on `mongodb://127.0.0.1:27017` (or a MongoDB Atlas URI)

### 2. Backend Setup (`/server`)
```bash
cd server
cp .env.example .env
npm install
npm run seed    # Populates 6 users, 15 posts/reels, 4 stories, 2 DM threads & notifications
npm run dev     # Starts API & Socket.io server on http://localhost:5000
```

### 3. Frontend Setup (`/client`)
```bash
cd client
cp .env.example .env
npm install
npm run dev     # Starts Vite dev server on http://localhost:5173
```

## Demo Account
Use the **One-Click Demo Login** button on `/login`, or sign in manually:
- **Username**: `ruthrakumar.j` (or `ruthrakumar.j@instagram.com`)
- **Password**: `password123`

## Key Features
- **Authentication**: Register, email/username login, JWT Bearer verification, password updates, and auto-logout on HTTP 401.
- **Feed & Posts**: Paginated following feed, double-tap heart burst animation, optimistic likes & bookmarks, nested comments & replies, comment likes, clickable `#hashtags`, and drag-and-drop creation with `1:1`, `4:5`, and `16:9` aspect ratios plus Advanced Settings.
- **24-Hour Stories**: MongoDB TTL expiration, gradient unseen / gray seen rings, auto-advancing segmented progress bar viewer, press-and-hold pause, left/right tap zones, and author viewer lists.
- **Explore, Tags & Reels**: Engagement-ranked Explore grid, `/explore/tags/:tag` discovery feed, and full-height vertical snap-scrolling Reels with `IntersectionObserver` auto-play/pause.
- **Real-Time Direct Messaging & Notifications**: Authenticated Socket.io connections, online presence indicators, live typing indicators, shared post cards, image attachments, seen receipts, and live notification drawer badges.
- **Dark & Light Mode**: Tailwind class strategy persisted in `localStorage`.

