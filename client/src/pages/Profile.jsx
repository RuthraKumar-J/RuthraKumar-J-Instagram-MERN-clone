import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Grid3X3,
  Clapperboard,
  Bookmark,
  Heart,
  MessageCircle,
  Play,
  Link as LinkIcon,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar, { VerifiedBadge } from '../components/common/Avatar';
import EditProfileModal from '../components/profile/EditProfileModal';
import FollowListModal from '../components/profile/FollowListModal';
import PostDetailModal from '../components/feed/PostDetailModal';
import SharePostModal from '../components/feed/SharePostModal';
import Loader from '../components/common/Loader';

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUserState } = useAuth();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'reels' | 'saved'
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [followModal, setFollowModal] = useState(null); // null | 'followers' | 'following'
  const [selectedPost, setSelectedPost] = useState(null);
  const [sharePost, setSharePost] = useState(null);

  const isOwnProfile =
    currentUser?.username?.toLowerCase() === username?.toLowerCase();

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, postsRes] = await Promise.all([
        api.get(`/users/${encodeURIComponent(username)}`),
        api.get(`/posts/user/${encodeURIComponent(username)}`),
      ]);
      setProfile(userRes.data.user);
      setPosts(postsRes.data.posts || []);

      if (currentUser?.username?.toLowerCase() === username?.toLowerCase()) {
        const savedRes = await api.get('/posts/saved');
        setSavedPosts(savedRes.data.posts || []);
      } else {
        setSavedPosts([]);
        setActiveTab((prev) => (prev === 'saved' ? 'posts' : prev));
      }
    } catch (err) {
      setProfile(null);
      toast.error(err.response?.data?.message || 'Profile not found');
    } finally {
      setLoading(false);
    }
  }, [username, currentUser?.username]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  useEffect(() => {
    const handlePostCreated = (e) => {
      if (e.detail && isOwnProfile) {
        setPosts((prev) => [e.detail, ...prev]);
        setProfile((prev) =>
          prev ? { ...prev, postsCount: (prev.postsCount || 0) + 1 } : prev
        );
      }
    };
    window.addEventListener('ig:post_created', handlePostCreated);
    return () => window.removeEventListener('ig:post_created', handlePostCreated);
  }, [isOwnProfile]);

  const isFollowing = Boolean(
    profile?.followers?.some((f) => (typeof f === 'string' ? f : f._id) === currentUser?._id)
  );

  const handleToggleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/users/${profile._id}/follow`);
      updateUserState((prev) => {
        const current = (prev.following || []).map((id) =>
          typeof id === 'string' ? id : id._id
        );
        const updated = data.following
          ? [...new Set([...current, profile._id])]
          : current.filter((id) => id !== profile._id);
        return { ...prev, following: updated };
      });
      await fetchProfileData();
      toast.success(data.following ? `Following ${profile.username}` : `Unfollowed ${profile.username}`);
    } catch {
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessageUser = async () => {
    if (!profile) return;
    try {
      const { data } = await api.post('/messages/conversations', {
        recipientId: profile._id,
      });
      navigate('/direct/inbox', {
        state: { conversationId: data.conversation._id },
      });
    } catch {
      toast.error('Could not open direct chat');
    }
  };

  const handlePostUpdated = (updated) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setSavedPosts((prev) =>
      prev.map((p) => (p._id === updated._id ? updated : p))
    );
    setSelectedPost((prev) => (prev?._id === updated._id ? updated : prev));
  };

  const handlePostDeleted = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
    setSavedPosts((prev) => prev.filter((p) => p._id !== deletedId));
    setProfile((prev) =>
      prev ? { ...prev, postsCount: Math.max(0, (prev.postsCount || 1) - 1) } : prev
    );
    setSelectedPost(null);
  };

  const formatWebsiteUrl = (site) => {
    if (!site) return '';
    return /^https?:\/\//i.test(site) ? site : `https://${site}`;
  };

  if (loading) return <Loader label="Loading profile..." />;

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-3">
        <h2 className="text-xl font-bold">Sorry, this page isn&apos;t available.</h2>
        <p className="text-sm text-neutral-500">
          The profile @{username} could not be found.
        </p>
      </div>
    );
  }

  const reels = posts.filter((p) => p.mediaType === 'video');
  const displayedPosts =
    activeTab === 'reels' ? reels : activeTab === 'saved' ? savedPosts : posts;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile header */}
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-12 pb-10 border-b border-neutral-200 dark:border-neutral-800">
        <div className="shrink-0">
          <Avatar
            src={profile.profilePic}
            alt={profile.username}
            size="2xl"
          />
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left space-y-4">
          {/* Username & CTA buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <h1 className="text-xl font-semibold flex items-center gap-1.5">
              {profile.username}
              {profile.isVerified && <VerifiedBadge className="w-4 h-4" />}
            </h1>

            {isOwnProfile ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="px-4 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Settings className="w-4 h-4" /> Edit profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={followLoading}
                  onClick={handleToggleFollow}
                  className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    isFollowing
                      ? 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      : 'bg-ig-blue hover:bg-ig-blueHover text-white'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  type="button"
                  onClick={handleMessageUser}
                  className="px-4 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm font-semibold transition-colors"
                >
                  Message
                </button>
              </div>
            )}
          </div>

          {/* Stats counters */}
          <div className="flex items-center justify-center sm:justify-start gap-7 text-sm">
            <div>
              <span className="font-semibold">{posts.length}</span>{' '}
              <span className="text-neutral-500">posts</span>
            </div>
            <button
              type="button"
              onClick={() => setFollowModal('followers')}
              className="hover:opacity-75"
            >
              <span className="font-semibold">
                {(profile.followers || []).length}
              </span>{' '}
              <span className="text-neutral-500">followers</span>
            </button>
            <button
              type="button"
              onClick={() => setFollowModal('following')}
              className="hover:opacity-75"
            >
              <span className="font-semibold">
                {(profile.following || []).length}
              </span>{' '}
              <span className="text-neutral-500">following</span>
            </button>
          </div>

          {/* Name, bio, website */}
          <div className="space-y-1 text-sm max-w-md mx-auto sm:mx-0">
            <p className="font-semibold">{profile.fullName}</p>
            {profile.bio && (
              <p className="whitespace-pre-line text-neutral-800 dark:text-neutral-200">
                {profile.bio}
              </p>
            )}
            {profile.website && (
              <a
                href={formatWebsiteUrl(profile.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ig-blue font-medium hover:underline break-all"
              >
                <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                {profile.website.replace(/^https?:\/\//i, '')}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-10 border-b border-neutral-200 dark:border-neutral-800 -mt-px">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-1.5 py-3.5 text-xs font-semibold uppercase tracking-wider border-t-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <Grid3X3 className="w-4 h-4" /> Posts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reels')}
          className={`flex items-center gap-1.5 py-3.5 text-xs font-semibold uppercase tracking-wider border-t-2 transition-colors ${
            activeTab === 'reels'
              ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <Clapperboard className="w-4 h-4" /> Reels
        </button>

        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 py-3.5 text-xs font-semibold uppercase tracking-wider border-t-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        )}
      </div>

      {/* Grid */}
      {displayedPosts.length === 0 ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          {activeTab === 'saved'
            ? 'Posts you bookmark will appear here.'
            : activeTab === 'reels'
            ? 'No video reels shared yet.'
            : 'No posts yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2 mt-4">
          {displayedPosts.map((post) => (
            <button
              key={post._id}
              type="button"
              onClick={() => setSelectedPost(post)}
              className="relative aspect-square bg-neutral-100 dark:bg-neutral-900 overflow-hidden group focus:outline-none"
            >
              {post.mediaType === 'video' ? (
                <>
                  <video
                    src={post.mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="auto"
                  />
                  <span className="absolute top-2 right-2 p-1 rounded-full bg-black/55 text-white">
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </span>
                </>
              ) : (
                <img
                  src={post.mediaUrl}
                  alt={post.caption || 'Post'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              )}

              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5 text-white font-semibold text-sm">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-5 h-5 fill-white" />
                  {(post.likes || []).length}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-5 h-5 fill-white" />
                  {(post.comments || []).length}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdated={(updated) => {
          if (updated.username !== username) {
            navigate(`/profile/${updated.username}`, { replace: true });
          } else {
            fetchProfileData();
          }
        }}
      />

      <FollowListModal
        title={followModal === 'followers' ? 'Followers' : 'Following'}
        users={
          followModal === 'followers'
            ? profile.followers || []
            : profile.following || []
        }
        open={Boolean(followModal)}
        onClose={() => setFollowModal(null)}
        onFollowChanged={fetchProfileData}
      />

      <PostDetailModal
        post={selectedPost}
        open={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
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

