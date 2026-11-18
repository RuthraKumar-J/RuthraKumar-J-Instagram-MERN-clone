import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Trash2,
  MapPin,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar, { VerifiedBadge } from '../common/Avatar';

export function renderCaptionWithHashtags(caption) {
  if (!caption) return null;
  const parts = caption.split(/(#\w+)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('#') && part.length > 1) {
      const tag = part.slice(1).toLowerCase();
      return (
        <Link
          key={idx}
          to={`/explore/tags/${tag}`}
          className="text-ig-blue hover:underline font-medium"
        >
          {part}
        </Link>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function PostCard({
  post,
  onOpenDetail,
  onOpenShare,
  onPostUpdated,
  onPostDeleted,
}) {
  const { user, updateUserState } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [likePop, setLikePop] = useState(false);
  const [muted, setMuted] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [imgFallback, setImgFallback] = useState(false);
  const videoRef = useRef(null);

  const userId = user?._id;
  const isOwner = post.author?._id === userId;
  const isLiked = (post.likes || []).some(
    (id) => (typeof id === 'string' ? id : id._id) === userId
  );
  const isSaved = (user?.savedPosts || []).some(
    (id) => (typeof id === 'string' ? id : id._id) === post._id
  );

  const aspectClass =
    post.aspectRatio === '4:5'
      ? 'aspect-[4/5]'
      : post.aspectRatio === '16:9'
      ? 'aspect-video'
      : 'aspect-square';

  const handleToggleLike = async (forceLike = false) => {
    if (forceLike && isLiked) return;

    const prevLikes = post.likes || [];
    const optimisticLikes = isLiked
      ? prevLikes.filter((id) => (typeof id === 'string' ? id : id._id) !== userId)
      : [...prevLikes, userId];

    setLikePop(true);
    setTimeout(() => setLikePop(false), 300);
    onPostUpdated?.({ ...post, likes: optimisticLikes });

    try {
      const { data } = await api.post(`/posts/${post._id}/like`);
      onPostUpdated?.({ ...post, likes: data.likes });
    } catch {
      onPostUpdated?.({ ...post, likes: prevLikes });
      toast.error('Could not update like');
    }
  };

  const handleDoubleTap = () => {
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);
    if (!isLiked) {
      handleToggleLike(true);
    }
  };

  const handleToggleSave = async () => {
    const prevSaved = user?.savedPosts || [];
    const nextSaved = isSaved
      ? prevSaved.filter((id) => (typeof id === 'string' ? id : id._id) !== post._id)
      : [...prevSaved, post._id];

    updateUserState({ savedPosts: nextSaved });

    try {
      const { data } = await api.post(`/posts/${post._id}/save`);
      updateUserState({ savedPosts: data.savedPosts });
      toast.success(data.saved ? 'Saved to collection' : 'Removed from saved');
    } catch {
      updateUserState({ savedPosts: prevSaved });
      toast.error('Failed to update bookmark');
    }
  };

  const handleInlineComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/comment`, {
        text: commentText.trim(),
      });
      onPostUpdated?.({ ...post, comments: data.comments });
      setCommentText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    setMenuOpen(false);
    try {
      await api.delete(`/posts/${post._id}`);
      toast.success('Post deleted');
      onPostDeleted?.(post._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete post');
    }
  };

  return (
    <article className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/profile/${post.author?.username}`}>
            <Avatar
              src={post.author?.profilePic}
              alt={post.author?.username}
              size="sm"
            />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                to={`/profile/${post.author?.username}`}
                className="text-sm font-semibold hover:opacity-75 truncate"
              >
                {post.author?.username}
              </Link>
              {post.author?.isVerified && <VerifiedBadge />}
              <span className="text-xs text-neutral-400">·</span>
              <time className="text-xs text-neutral-500 dark:text-neutral-400">
                {post.createdAt
                  ? formatDistanceToNowStrict(new Date(post.createdAt))
                  : ''}
              </time>
            </div>
            {post.location && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-0.5 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {post.location}
              </p>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Post options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-44 z-20 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-1 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenDetail?.(post);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  View details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenShare?.(post);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Share to DM
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-4 h-4" /> Delete post
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Media with double-click heart burst */}
      <div
        onDoubleClick={handleDoubleTap}
        className={`relative w-full ${aspectClass} bg-neutral-100 dark:bg-neutral-900 overflow-hidden select-none cursor-pointer`}
      >
        {!mediaLoaded && (
          <div className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-neutral-800" />
        )}
        {post.mediaType === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={post.mediaUrl}
              className="w-full h-full object-cover relative z-[1]"
              autoPlay
              loop
              muted={muted}
              playsInline
              preload="auto"
              onLoadedData={() => setMediaLoaded(true)}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMuted((m) => !m);
              }}
              className="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              aria-label={muted ? 'Unmute video' : 'Mute video'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </>
        ) : (
          <img
            src={
              imgFallback
                ? `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}/uploads/seed/post-dolomites.jpg`
                : post.mediaUrl
            }
            alt={post.caption || 'Post'}
            className="w-full h-full object-cover relative z-[1]"
            onLoad={() => setMediaLoaded(true)}
            onError={() => {
              setImgFallback(true);
              setMediaLoaded(true);
            }}
          />
        )}

        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl animate-heart-burst" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleToggleLike(false)}
              className={`hover:opacity-70 transition-opacity ${
                likePop ? 'animate-like-pop' : ''
              }`}
              aria-label={isLiked ? 'Unlike post' : 'Like post'}
            >
              <Heart
                className={`w-6 h-6 ${
                  isLiked ? 'text-ig-red fill-ig-red' : ''
                }`}
              />
            </button>

            {!post.disableComments && (
              <button
                type="button"
                onClick={() => onOpenDetail?.(post)}
                className="hover:opacity-70 transition-opacity"
                aria-label="Comment on post"
              >
                <MessageCircle className="w-6 h-6" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenShare?.(post)}
              className="hover:opacity-70 transition-opacity"
              aria-label="Share post"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleSave}
            className="hover:opacity-70 transition-opacity"
            aria-label={isSaved ? 'Unsave post' : 'Save post'}
          >
            <Bookmark
              className={`w-6 h-6 ${
                isSaved ? 'fill-neutral-900 dark:fill-white' : ''
              }`}
            />
          </button>
        </div>

        {/* Likes count */}
        {!post.hideLikes && (
          <p className="text-sm font-semibold mb-1.5">
            {(post.likes || []).length.toLocaleString()}{' '}
            {(post.likes || []).length === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-sm leading-relaxed mb-1.5 break-words">
            <Link
              to={`/profile/${post.author?.username}`}
              className="font-semibold mr-1.5 hover:underline"
            >
              {post.author?.username}
            </Link>
            {renderCaptionWithHashtags(post.caption)}
          </p>
        )}

        {/* Comments summary */}
        {!post.disableComments && (post.comments || []).length > 0 && (
          <button
            type="button"
            onClick={() => onOpenDetail?.(post)}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-2 block"
          >
            View all {post.comments.length}{' '}
            {post.comments.length === 1 ? 'comment' : 'comments'}
          </button>
        )}

        {/* Inline comment form */}
        {!post.disableComments && (
          <form
            onSubmit={handleInlineComment}
            className="flex items-center gap-2 pt-2 mt-1 border-t border-neutral-100 dark:border-neutral-900"
          >
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent text-sm py-1 focus:outline-none placeholder:text-neutral-400"
            />
            {commentText.trim() && (
              <button
                type="submit"
                disabled={submittingComment}
                className="text-sm font-semibold text-ig-blue hover:text-ig-blueHover disabled:opacity-50"
              >
                Post
              </button>
            )}
          </form>
        )}
      </div>
    </article>
  );
}

