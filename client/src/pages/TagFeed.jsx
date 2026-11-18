import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Hash, Heart, MessageCircle, Play, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import PostDetailModal from '../components/feed/PostDetailModal';
import SharePostModal from '../components/feed/SharePostModal';
import Loader from '../components/common/Loader';

export default function TagFeed() {
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [sharePost, setSharePost] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/posts/tag/${encodeURIComponent(tag)}`)
      .then(({ data }) => {
        setPosts(data.posts || []);
      })
      .catch(() => toast.error('Failed to load hashtag posts'))
      .finally(() => setLoading(false));
  }, [tag]);

  const handlePostUpdated = (updated) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setSelectedPost((prev) => (prev?._id === updated._id ? updated : prev));
  };

  const handlePostDeleted = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
    setSelectedPost(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-8">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Explore
      </Link>

      <div className="flex items-center gap-5 pb-8 mb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="w-20 h-20 rounded-full story-gradient-ring p-[2.5px] shrink-0">
          <div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center">
            <Hash className="w-9 h-9 text-neutral-900 dark:text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">#{tag}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            <span className="font-semibold text-neutral-900 dark:text-white">
              {posts.length}
            </span>{' '}
            {posts.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
      </div>

      {loading ? (
        <Loader label={`Loading #${tag}...`} />
      ) : posts.length === 0 ? (
        <div className="py-16 text-center text-sm text-neutral-500">
          No posts tagged with #{tag} yet.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {posts.map((post) => (
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
                  />
                  <span className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white">
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </span>
                </>
              ) : (
                <img
                  src={post.mediaUrl}
                  alt={post.caption || `#${tag}`}
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

