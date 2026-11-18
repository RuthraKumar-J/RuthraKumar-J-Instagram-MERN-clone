import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar, { VerifiedBadge } from '../common/Avatar';

const IMAGE_DURATION_MS = 5000;

export default function StoryViewerModal({
  storyGroups = [],
  initialGroupIndex = 0,
  onClose,
  onStoryViewed,
  onStoryDeleted,
}) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [durationMs, setDurationMs] = useState(IMAGE_DURATION_MS);
  const videoRef = useRef(null);
  const viewedIdsRef = useRef(new Set());

  const currentGroup = storyGroups[groupIdx];
  const currentStory = currentGroup?.stories?.[storyIdx];
  const isOwnStory = currentGroup?.author?._id === user?._id;

  const goNext = useCallback(() => {
    if (!currentGroup) {
      onClose();
      return;
    }
    if (storyIdx < currentGroup.stories.length - 1) {
      setStoryIdx((s) => s + 1);
      setProgress(0);
    } else if (groupIdx < storyGroups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentGroup, storyIdx, groupIdx, storyGroups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((s) => s - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      const prevGroup = storyGroups[groupIdx - 1];
      setGroupIdx((g) => g - 1);
      setStoryIdx(Math.max(0, (prevGroup?.stories?.length || 1) - 1));
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [storyIdx, groupIdx, storyGroups]);

  // Mark story as viewed
  useEffect(() => {
    if (!currentStory?._id) return;
    setProgress(0);
    setDurationMs(IMAGE_DURATION_MS);

    if (!viewedIdsRef.current.has(currentStory._id)) {
      viewedIdsRef.current.add(currentStory._id);
      api
        .post(`/stories/${currentStory._id}/view`)
        .then(({ data }) => {
          onStoryViewed?.(currentStory._id, data.viewers);
        })
        .catch(() => {});
    }
  }, [currentStory?._id, onStoryViewed]);

  // Progress timer for images (videos drive progress via timeupdate)
  useEffect(() => {
    if (!currentStory || paused || viewersOpen) return;
    if (currentStory.mediaType === 'video') return;

    const tickMs = 50;
    const step = (tickMs / durationMs) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          clearInterval(timer);
          setTimeout(goNext, 0);
          return 100;
        }
        return prev + step;
      });
    }, tickMs);

    return () => clearInterval(timer);
  }, [currentStory, paused, viewersOpen, durationMs, goNext]);

  // Pause/play video when held or drawer opens
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (paused || viewersOpen) {
      vid.pause();
    } else {
      vid.play().catch(() => {});
    }
  }, [paused, viewersOpen, currentStory?._id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  if (!currentGroup || !currentStory) return null;

  const handleDelete = async () => {
    try {
      await api.delete(`/stories/${currentStory._id}`);
      toast.success('Story deleted');
      onStoryDeleted?.(currentStory._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete story');
    }
  };

  const handleZoneClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    if (ratio < 0.3) {
      goPrev();
    } else if (ratio > 0.7) {
      goNext();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 flex items-center justify-center select-none">
      {/* Top logo & close */}
      <span className="hidden md:block fixed top-5 left-6 font-logo text-3xl text-white">
        Instagram
      </span>
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-50 p-2 rounded-full text-white hover:bg-white/10 transition-colors"
        aria-label="Close stories"
      >
        <X className="w-7 h-7" />
      </button>

      {/* Desktop prev/next arrows */}
      {groupIdx > 0 || storyIdx > 0 ? (
        <button
          type="button"
          onClick={goPrev}
          className="hidden md:flex fixed left-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center transition-colors"
          aria-label="Previous story"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      ) : null}

      <button
        type="button"
        onClick={goNext}
        className="hidden md:flex fixed right-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center transition-colors"
        aria-label="Next story"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Story frame */}
      <div
        className="relative w-full max-w-[420px] h-full md:h-[90vh] md:max-h-[780px] md:rounded-2xl overflow-hidden bg-black shadow-2xl flex flex-col"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {/* Segmented progress bars */}
        <div className="absolute top-3 inset-x-3 z-20 flex gap-1.5">
          {currentGroup.stories.map((st, idx) => {
            const fill =
              idx < storyIdx ? 100 : idx === storyIdx ? progress : 0;
            return (
              <div
                key={st._id}
                className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-[width] duration-75 ease-linear"
                  style={{ width: `${fill}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Author header */}
        <div className="absolute top-6 inset-x-3 z-20 flex items-center justify-between">
          <Link
            to={`/profile/${currentGroup.author.username}`}
            onClick={onClose}
            className="flex items-center gap-2.5"
          >
            <Avatar
              src={currentGroup.author.profilePic}
              alt={currentGroup.author.username}
              size="sm"
            />
            <div className="flex items-center gap-1.5 text-white drop-shadow">
              <span className="text-sm font-semibold">
                {currentGroup.author.username}
              </span>
              {currentGroup.author.isVerified && <VerifiedBadge />}
              <span className="text-xs text-white/75">
                {currentStory.createdAt
                  ? formatDistanceToNowStrict(new Date(currentStory.createdAt))
                  : ''}
              </span>
            </div>
          </Link>

          <div
            className="flex items-center gap-1.5 text-white"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="p-1.5 rounded-full hover:bg-white/15"
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            {currentStory.mediaType === 'video' && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="p-1.5 rounded-full hover:bg-white/15"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            {isOwnStory && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 rounded-full hover:bg-red-500/30 text-white"
                aria-label="Delete story"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Media container with left/right tap zones */}
        <div
          onClick={handleZoneClick}
          className="relative flex-1 w-full h-full flex items-center justify-center bg-black cursor-pointer"
        >
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 to-transparent z-10 pointer-events-none" />

          {currentStory.mediaType === 'video' ? (
            <video
              ref={videoRef}
              key={currentStory._id}
              src={currentStory.mediaUrl}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              muted={muted}
              onLoadedMetadata={(e) => {
                if (e.currentTarget.duration) {
                  setDurationMs(e.currentTarget.duration * 1000);
                }
              }}
              onTimeUpdate={(e) => {
                const dur = e.currentTarget.duration;
                if (dur > 0) {
                  setProgress((e.currentTarget.currentTime / dur) * 100);
                }
              }}
              onEnded={goNext}
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt={currentStory.overlayText || 'Story'}
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}

          {currentStory.overlayText && (
            <div className="absolute bottom-16 inset-x-5 z-20 text-center pointer-events-none">
              <span className="inline-block px-3.5 py-2 rounded-xl bg-black/60 text-white text-sm font-medium backdrop-blur-sm">
                {currentStory.overlayText}
              </span>
            </div>
          )}
        </div>

        {/* Author's Seen By bar */}
        {isOwnStory && (
          <div
            className="absolute bottom-3 inset-x-3 z-20"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewersOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-sm"
            >
              <Eye className="w-4 h-4" />
              <span>Seen by {currentStory.viewers?.length || 0}</span>
            </button>
          </div>
        )}

        {/* Viewers drawer */}
        {viewersOpen && isOwnStory && (
          <div
            className="absolute inset-x-0 bottom-0 z-30 max-h-[60%] bg-neutral-900 text-white rounded-t-2xl p-4 flex flex-col"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-sm font-semibold">
                Viewers ({currentStory.viewers?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => setViewersOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto py-2 space-y-2">
              {(currentStory.viewers || []).length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">
                  No viewers yet.
                </p>
              ) : (
                currentStory.viewers.map((v) => (
                  <Link
                    key={v.user?._id || v._id}
                    to={`/profile/${v.user?.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 py-1.5 hover:bg-neutral-800/70 px-2 rounded-lg"
                  >
                    <Avatar
                      src={v.user?.profilePic}
                      alt={v.user?.username}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate flex items-center gap-1">
                        {v.user?.username}
                        {v.user?.isVerified && <VerifiedBadge />}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {v.user?.fullName}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

