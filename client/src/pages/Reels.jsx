import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Clapperboard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar, { VerifiedBadge } from '../components/common/Avatar';
import { renderCaptionWithHashtags } from '../components/feed/PostCard';
import PostDetailModal from '../components/feed/PostDetailModal';
import SharePostModal from '../components/feed/SharePostModal';
import Loader from '../components/common/Loader';

function ReelItem({
  reel,
  muted,
  onToggleMute,
  onLike,
  onSave,
  onOpenComments,
  onOpenShare,
  isLiked,
  isSaved,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          vid.play().then(() => setIsPaused(false)).catch(() => {});
        } else {
          vid.pause();
          setIsPaused(true);
        }
      },
      { threshold: [0.25, 0.65] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPaused(false)).catch(() => {});
    } else {
      vid.pause();
      setIsPaused(true);
    }
  };

  return (
    <section
      ref={containerRef}
      className="snap-start h-[calc(100vh-3.5rem)] md:h-screen w-full flex items-center justify-center py-2 md:py-5 px-2"
    >
      <div className="relative h-full w-full max-w-[420px] rounded-2xl overflow-hidden bg-black shadow-2xl flex items-center justify-center">
        <video
          ref={videoRef}
          src={reel.mediaUrl}
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
          loop
          muted={muted}
          playsInline
        />

        {isPaused && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-label="Play reel"
          >
            <div className="p-4 rounded-full bg-black/50 text-white">
              <Play className="w-10 h-10 fill-white" />
            </div>
          </button>
        )}

        {/* Top mute toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/55 text-white hover:bg-black/75"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Bottom gradient + author/caption */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

        <div className="absolute bottom-5 left-4 right-16 z-10 text-white space-y-2">
          <Link
            to={`/profile/${reel.author?.username}`}
            className="inline-flex items-center gap-2.5"
          >
            <Avatar
              src={reel.author?.profilePic}
              alt={reel.author?.username}
              size="sm"
            />
            <span className="font-semibold text-sm flex items-center gap-1 drop-shadow">
              {reel.author?.username}
              {reel.author?.isVerified && <VerifiedBadge />}
            </span>
          </Link>
          {reel.caption && (
            <p className="text-xs sm:text-sm text-white/95 line-clamp-3 leading-relaxed">
              {renderCaptionWithHashtags(reel.caption)}
            </p>
          )}
        </div>

        {/* Right vertical action stack */}
        <div className="absolute right-3 bottom-6 z-10 flex flex-col items-center gap-5 text-white">
          <button
            type="button"
            onClick={() => onLike(reel)}
            className="flex flex-col items-center gap-1 hover:scale-105 transition-transform"
          >
            <Heart
              className={`w-7 h-7 drop-shadow ${
                isLiked ? 'text-ig-red fill-ig-red' : ''
              }`}
            />
            <span className="text-xs font-semibold">
              {(reel.likes || []).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenComments(reel)}
            className="flex flex-col items-center gap-1 hover:scale-105 transition-transform"
          >
            <MessageCircle className="w-7 h-7 drop-shadow" />
            <span className="text-xs font-semibold">
              {(reel.comments || []).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenShare(reel)}
            className="flex flex-col items-center gap-1 hover:scale-105 transition-transform"
          >
            <Send className="w-6 h-6 drop-shadow" />
          </button>

          <button
            type="button"
            onClick={() => onSave(reel)}
            className="flex flex-col items-center gap-1 hover:scale-105 transition-transform"
          >
            <Bookmark
              className={`w-6 h-6 drop-shadow ${isSaved ? 'fill-white' : ''}`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Reels() {
  const { user, updateUserState } = useAuth();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [detailReel, setDetailReel] = useState(null);
  const [shareReel, setShareReel] = useState(null);

  useEffect(() => {
    api
      .get('/posts/reels')
      .then(({ data }) => setReels(data.posts || []))
      .catch(() => toast.error('Failed to load reels'))
      .finally(() => setLoading(false));
  }, []);

  const handleLike = async (reel) => {
    try {
      const { data } = await api.post(`/posts/${reel._id}/like`);
      const updated = { ...reel, likes: data.likes };
      setReels((prev) => prev.map((r) => (r._id === reel._id ? updated : r)));
    } catch {
      toast.error('Could not like reel');
    }
  };

  const handleSave = async (reel) => {
    try {
      const { data } = await api.post(`/posts/${reel._id}/save`);
      updateUserState({ savedPosts: data.savedPosts });
      toast.success(data.saved ? 'Saved reel' : 'Removed from saved');
    } catch {
      toast.error('Could not save reel');
    }
  };

  const handleUpdated = (updated) => {
    setReels((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    setDetailReel((prev) => (prev?._id === updated._id ? updated : prev));
  };

  const handleDeleted = (deletedId) => {
    setReels((prev) => prev.filter((r) => r._id !== deletedId));
    setDetailReel(null);
  };

  if (loading) return <Loader label="Loading Reels..." />;

  if (reels.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 gap-3">
        <Clapperboard className="w-12 h-12 text-neutral-400" />
        <h2 className="text-lg font-semibold">No Reels yet</h2>
        <p className="text-sm text-neutral-500">
          Upload an MP4 or WebM video post to see it featured in Reels.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen overflow-y-scroll snap-y snap-mandatory no-scrollbar">
      {reels.map((reel) => {
        const isLiked = (reel.likes || []).some(
          (id) => (typeof id === 'string' ? id : id._id) === user?._id
        );
        const isSaved = (user?.savedPosts || []).some(
          (id) => (typeof id === 'string' ? id : id._id) === reel._id
        );
        return (
          <ReelItem
            key={reel._id}
            reel={reel}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onLike={handleLike}
            onSave={handleSave}
            onOpenComments={(r) => setDetailReel(r)}
            onOpenShare={(r) => setShareReel(r)}
            isLiked={isLiked}
            isSaved={isSaved}
          />
        );
      })}

      <PostDetailModal
        post={detailReel}
        open={Boolean(detailReel)}
        onClose={() => setDetailReel(null)}
        onPostUpdated={handleUpdated}
        onPostDeleted={handleDeleted}
        onOpenShare={(p) => setShareReel(p)}
      />

      <SharePostModal
        post={shareReel}
        open={Boolean(shareReel)}
        onClose={() => setShareReel(null)}
      />
    </div>
  );
}

