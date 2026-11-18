import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Trash2,
  CornerDownRight,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar, { VerifiedBadge } from '../common/Avatar';
import { renderCaptionWithHashtags } from './PostCard';

export default function PostDetailModal({
  post,
  open,
  onClose,
  onPostUpdated,
  onPostDeleted,
  onOpenShare,
}) {
  const { user, updateUserState } = useAuth();
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, username }
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  if (!open || !post) return null;

  const userId = user?._id;
  const isOwner = post.author?._id === userId;
  const isLiked = (post.likes || []).some(
    (id) => (typeof id === 'string' ? id : id._id) === userId
  );
  const isSaved = (user?.savedPosts || []).some(
    (id) => (typeof id === 'string' ? id : id._id) === post._id
  );

  const handleToggleLike = async () => {
    try {
      const { data } = await api.post(`/posts/${post._id}/like`);
      onPostUpdated?.({ ...post, likes: data.likes });
    } catch {
      toast.error('Failed to like post');
    }
  };

  const handleToggleSave = async () => {
    try {
      const { data } = await api.post(`/posts/${post._id}/save`);
      updateUserState({ savedPosts: data.savedPosts });
      toast.success(data.saved ? 'Saved' : 'Removed from saved');
    } catch {
      toast.error('Failed to update saved status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);

    try {
      if (replyingTo) {
        const { data } = await api.post(
          `/posts/${post._id}/comment/${replyingTo.commentId}/reply`,
          { text: text.trim() }
        );
        onPostUpdated?.({ ...post, comments: data.comments });
        setReplyingTo(null);
      } else {
        const { data } = await api.post(`/posts/${post._id}/comment`, {
          text: text.trim(),
        });
        onPostUpdated?.({ ...post, comments: data.comments });
      }
      setText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCommentLike = async (commentId) => {
    try {
      const { data } = await api.post(
        `/posts/${post._id}/comment/${commentId}/like`
      );
      onPostUpdated?.({ ...post, comments: data.comments });
    } catch {
      toast.error('Failed to like comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const { data } = await api.delete(`/posts/${post._id}/comment/${commentId}`);
      onPostUpdated?.({ ...post, comments: data.comments });
      toast.success('Comment deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete comment');
    }
  };

  const handleDeletePost = async () => {
    try {
      await api.delete(`/posts/${post._id}`);
      toast.success('Post deleted');
      onPostDeleted?.(post._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete post');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 md:p-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-50 p-2 rounded-full text-white hover:bg-white/15"
        aria-label="Close modal"
      >
        <X className="w-7 h-7" />
      </button>

      <div
        className="w-full max-w-5xl h-[90vh] max-h-[760px] bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left media pane */}
        <div className="md:w-[58%] h-72 md:h-full bg-black flex items-center justify-center shrink-0">
          {post.mediaType === 'video' ? (
            <video
              src={post.mediaUrl}
              className="w-full h-full object-contain"
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt={post.caption || 'Post'}
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Right details & comments pane */}
        <div className="md:w-[42%] flex-1 flex flex-col min-h-0">
          {/* Author bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <Link
              to={`/profile/${post.author?.username}`}
              onClick={onClose}
              className="flex items-center gap-3 min-w-0"
            >
              <Avatar
                src={post.author?.profilePic}
                alt={post.author?.username}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate flex items-center gap-1">
                  {post.author?.username}
                  {post.author?.isVerified && <VerifiedBadge />}
                </p>
                {post.location && (
                  <p className="text-xs text-neutral-500 truncate">{post.location}</p>
                )}
              </div>
            </Link>

            {isOwner && (
              <button
                type="button"
                onClick={handleDeletePost}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scrollable caption + comments */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {post.caption && (
              <div className="flex gap-3">
                <Link to={`/profile/${post.author?.username}`} onClick={onClose}>
                  <Avatar
                    src={post.author?.profilePic}
                    alt={post.author?.username}
                    size="sm"
                  />
                </Link>
                <div className="text-sm leading-relaxed flex-1">
                  <Link
                    to={`/profile/${post.author?.username}`}
                    onClick={onClose}
                    className="font-semibold mr-1.5 hover:underline"
                  >
                    {post.author?.username}
                  </Link>
                  {renderCaptionWithHashtags(post.caption)}
                  <p className="text-[11px] text-neutral-400 mt-1">
                    {post.createdAt
                      ? formatDistanceToNowStrict(new Date(post.createdAt))
                      : ''}
                  </p>
                </div>
              </div>
            )}

            {post.disableComments ? (
              <p className="text-center text-xs text-neutral-500 py-8">
                Comments are turned off for this post.
              </p>
            ) : (post.comments || []).length === 0 ? (
              <p className="text-center text-sm text-neutral-500 py-8">
                No comments yet. Start the conversation!
              </p>
            ) : (
              post.comments.map((comment) => {
                const commentLiked = (comment.likes || []).some(
                  (id) => (typeof id === 'string' ? id : id._id) === userId
                );
                const canDelete =
                  isOwner || comment.user?._id === userId;

                return (
                  <div key={comment._id} className="space-y-2.5">
                    <div className="flex items-start gap-3 group">
                      <Link
                        to={`/profile/${comment.user?.username}`}
                        onClick={onClose}
                      >
                        <Avatar
                          src={comment.user?.profilePic}
                          alt={comment.user?.username}
                          size="sm"
                        />
                      </Link>
                      <div className="flex-1 min-w-0 text-sm">
                        <div>
                          <Link
                            to={`/profile/${comment.user?.username}`}
                            onClick={onClose}
                            className="font-semibold mr-1.5 hover:underline inline-flex items-center gap-1"
                          >
                            {comment.user?.username}
                            {comment.user?.isVerified && (
                              <VerifiedBadge className="w-3 h-3" />
                            )}
                          </Link>
                          <span className="break-words">{comment.text}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500">
                          <span>
                            {comment.createdAt
                              ? formatDistanceToNowStrict(
                                  new Date(comment.createdAt)
                                )
                              : ''}
                          </span>
                          {(comment.likes || []).length > 0 && (
                            <span className="font-semibold">
                              {comment.likes.length}{' '}
                              {comment.likes.length === 1 ? 'like' : 'likes'}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo({
                                commentId: comment._id,
                                username: comment.user?.username,
                              });
                              setText(`@${comment.user?.username} `);
                              inputRef.current?.focus();
                            }}
                            className="font-semibold hover:text-neutral-800 dark:hover:text-neutral-200"
                          >
                            Reply
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment._id)}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:underline transition-opacity"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCommentLike(comment._id)}
                        className="pt-1 text-neutral-400 hover:text-ig-red"
                        aria-label="Like comment"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            commentLiked ? 'text-ig-red fill-ig-red' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Nested replies */}
                    {(comment.replies || []).length > 0 && (
                      <div className="pl-10 space-y-2.5">
                        {comment.replies.map((reply) => (
                          <div key={reply._id} className="flex items-start gap-2.5">
                            <CornerDownRight className="w-3.5 h-3.5 text-neutral-400 mt-1 shrink-0" />
                            <Link
                              to={`/profile/${reply.user?.username}`}
                              onClick={onClose}
                            >
                              <Avatar
                                src={reply.user?.profilePic}
                                alt={reply.user?.username}
                                size="xs"
                              />
                            </Link>
                            <div className="text-xs leading-relaxed flex-1">
                              <Link
                                to={`/profile/${reply.user?.username}`}
                                onClick={onClose}
                                className="font-semibold mr-1.5 hover:underline"
                              >
                                {reply.user?.username}
                              </Link>
                              <span className="break-words">{reply.text}</span>
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                {reply.createdAt
                                  ? formatDistanceToNowStrict(
                                      new Date(reply.createdAt)
                                    )
                                  : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Actions footer */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button type="button" onClick={handleToggleLike} aria-label="Like">
                  <Heart
                    className={`w-6 h-6 ${
                      isLiked ? 'text-ig-red fill-ig-red' : ''
                    }`}
                  />
                </button>
                {!post.disableComments && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    aria-label="Focus comment input"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenShare?.(post)}
                  aria-label="Share"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
              <button type="button" onClick={handleToggleSave} aria-label="Save">
                <Bookmark
                  className={`w-6 h-6 ${
                    isSaved ? 'fill-neutral-900 dark:fill-white' : ''
                  }`}
                />
              </button>
            </div>

            {!post.hideLikes && (
              <p className="text-sm font-semibold">
                {(post.likes || []).length.toLocaleString()}{' '}
                {(post.likes || []).length === 1 ? 'like' : 'likes'}
              </p>
            )}
          </div>

          {/* Comment / Reply composer */}
          {!post.disableComments && (
            <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-2.5">
              {replyingTo && (
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
                  <span>Replying to @{replyingTo.username}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setText('');
                    }}
                    className="text-neutral-400 hover:text-neutral-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    replyingTo
                      ? `Reply to ${replyingTo.username}...`
                      : 'Add a comment...'
                  }
                  className="flex-1 bg-transparent text-sm py-1 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || submitting}
                  className="text-sm font-semibold text-ig-blue hover:text-ig-blueHover disabled:opacity-40"
                >
                  Post
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

