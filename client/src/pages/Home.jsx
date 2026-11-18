import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StoriesBar from '../components/feed/StoriesBar';
import StoryViewerModal from '../components/feed/StoryViewerModal';
import CreateStoryModal from '../components/feed/CreateStoryModal';
import PostCard from '../components/feed/PostCard';
import PostDetailModal from '../components/feed/PostDetailModal';
import SharePostModal from '../components/feed/SharePostModal';
import Avatar, { VerifiedBadge } from '../components/common/Avatar';
import Loader from '../components/common/Loader';

export default function Home() {
  const { user, updateUserState } = useAuth();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [storyGroups, setStoryGroups] = useState([]);
  const [activeStoryGroupIdx, setActiveStoryGroupIdx] = useState(null);
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [followedSuggestions, setFollowedSuggestions] = useState({});

  const [detailPost, setDetailPost] = useState(null);
  const [sharePost, setSharePost] = useState(null);

  const fetchFeed = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoadingFeed(true);

      const { data } = await api.get(`/posts/feed?page=${pageNum}&limit=10`);
      setPosts((prev) => (append ? [...prev, ...(data.posts || [])] : data.posts || []));
      setPage(data.page || pageNum);
      setHasMore(Boolean(data.hasMore));
    } catch {
      toast.error('Failed to load feed');
    } finally {
      setLoadingFeed(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchStories = useCallback(async () => {
    try {
      const { data } = await api.get('/stories/feed');
      setStoryGroups(data.storyGroups || []);
    } catch {
      // Ignore silent failure
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const { data } = await api.get('/users/suggestions');
      setSuggestions(data.users || []);
    } catch {
      // Ignore silent failure
    }
  }, []);

  useEffect(() => {
    fetchFeed(1, false);
    fetchStories();
    fetchSuggestions();
  }, [fetchFeed, fetchStories, fetchSuggestions]);

  // Prepend newly created posts immediately
  useEffect(() => {
    const handlePostCreated = (e) => {
      if (e.detail) {
        setPosts((prev) => [e.detail, ...prev]);
      }
    };
    window.addEventListener('ig:post_created', handlePostCreated);
    return () => window.removeEventListener('ig:post_created', handlePostCreated);
  }, []);

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
    setDetailPost((prev) => (prev?._id === updatedPost._id ? updatedPost : prev));
  };

  const handlePostDeleted = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
    setDetailPost((prev) => (prev?._id === deletedId ? null : prev));
  };

  const handleStoryViewed = useCallback((storyId, viewers) => {
    setStoryGroups((prev) =>
      prev.map((group) => {
        const updatedStories = group.stories.map((st) =>
          st._id === storyId ? { ...st, isViewed: true, viewers } : st
        );
        const hasUnseen = updatedStories.some((st) => !st.isViewed);
        return { ...group, stories: updatedStories, hasUnseen, allViewed: !hasUnseen };
      })
    );
  }, []);

  const handleFollowSuggestion = async (targetId) => {
    try {
      const { data } = await api.post(`/users/${targetId}/follow`);
      setFollowedSuggestions((prev) => ({ ...prev, [targetId]: data.following }));
      updateUserState((prev) => {
        const current = (prev.following || []).map((id) =>
          typeof id === 'string' ? id : id._id
        );
        const updated = data.following
          ? [...new Set([...current, targetId])]
          : current.filter((id) => id !== targetId);
        return { ...prev, following: updated };
      });
      toast.success(data.following ? 'Following user' : 'Unfollowed user');
    } catch {
      toast.error('Action failed');
    }
  };

  return (
    <div className="max-w-[970px] mx-auto px-4 py-6 flex justify-center gap-10">
      {/* Main feed column */}
      <div className="w-full max-w-[560px]">
        <StoriesBar
          storyGroups={storyGroups}
          onOpenStory={(idx) => setActiveStoryGroupIdx(idx)}
          onOpenCreateStory={() => setCreateStoryOpen(true)}
        />

        {loadingFeed ? (
          <Loader label="Loading your feed..." />
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-10 text-center space-y-3">
            <h2 className="text-lg font-semibold">Your feed is quiet</h2>
            <p className="text-sm text-neutral-500">
              Follow creators or explore popular posts to fill your timeline.
            </p>
            <Link
              to="/explore"
              className="inline-block px-5 py-2 rounded-lg bg-ig-blue hover:bg-ig-blueHover text-white text-sm font-semibold"
            >
              Explore posts
            </Link>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onOpenDetail={(p) => setDetailPost(p)}
                onOpenShare={(p) => setSharePost(p)}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
              />
            ))}

            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => fetchFeed(page + 1, true)}
                  className="px-6 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading more...' : 'Load more posts'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop Right Rail */}
      <aside className="hidden lg:block w-[300px] shrink-0 pt-2">
        <div className="sticky top-6 space-y-6">
          {/* Current user summary */}
          <div className="flex items-center justify-between">
            <Link
              to={`/profile/${user?.username}`}
              className="flex items-center gap-3 min-w-0"
            >
              <Avatar src={user?.profilePic} alt={user?.username} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate flex items-center gap-1">
                  {user?.username}
                  {user?.isVerified && <VerifiedBadge />}
                </p>
                <p className="text-xs text-neutral-500 truncate">{user?.fullName}</p>
              </div>
            </Link>
            <Link
              to={`/profile/${user?.username}`}
              className="text-xs font-semibold text-ig-blue hover:text-ig-blueHover"
            >
              Profile
            </Link>
          </div>

          {/* Suggested for you */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                Suggested for you
              </span>
              <Link
                to="/explore"
                className="text-xs font-semibold hover:opacity-70"
              >
                Explore
              </Link>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-xs text-neutral-500">
                You&apos;re caught up with everyone!
              </p>
            ) : (
              <div className="space-y-3.5">
                {suggestions.map((sug) => {
                  const isFollowed = Boolean(followedSuggestions[sug._id]);
                  return (
                    <div
                      key={sug._id}
                      className="flex items-center justify-between gap-2"
                    >
                      <Link
                        to={`/profile/${sug.username}`}
                        className="flex items-center gap-3 min-w-0"
                      >
                        <Avatar
                          src={sug.profilePic}
                          alt={sug.username}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate flex items-center gap-1">
                            {sug.username}
                            {sug.isVerified && <VerifiedBadge />}
                          </p>
                          <p className="text-[11px] text-neutral-500 truncate">
                            {sug.followersCount || 0} followers
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleFollowSuggestion(sug._id)}
                        className={`text-xs font-semibold shrink-0 transition-colors ${
                          isFollowed
                            ? 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                            : 'text-ig-blue hover:text-ig-blueHover'
                        }`}
                      >
                        {isFollowed ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed pt-2">
            Instagram Clone · MERN Stack + Socket.io + Tailwind CSS
          </p>
        </div>
      </aside>

      {/* Modals */}
      {activeStoryGroupIdx !== null && storyGroups.length > 0 && (
        <StoryViewerModal
          storyGroups={storyGroups}
          initialGroupIndex={activeStoryGroupIdx}
          onClose={() => setActiveStoryGroupIdx(null)}
          onStoryViewed={handleStoryViewed}
          onStoryDeleted={() => fetchStories()}
        />
      )}

      <CreateStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onCreated={() => fetchStories()}
      />

      <PostDetailModal
        post={detailPost}
        open={Boolean(detailPost)}
        onClose={() => setDetailPost(null)}
        onPostUpdated={handlePostUpdated}
        onPostDeleted={handlePostDeleted}
        onOpenShare={(p) => setSharePost(p)}
      />

      <SharePostModal
        post={sharePost}
        open={Boolean(sharePost)}
        onClose={() => setSharePost(null)}
      />
    </div>
  );
}

