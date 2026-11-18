import { useEffect, useState, useCallback } from 'react';
import { Heart, MessageCircle, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import PostDetailModal from '../components/feed/PostDetailModal';
import SharePostModal from '../components/feed/SharePostModal';
import Loader from '../components/common/Loader';

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [sharePost, setSharePost] = useState(null);

  const fetchExplore = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const { data } = await api.get(`/posts/explore?page=${pageNum}&limit=18`);
      setPosts((prev) =>
        append ? [...prev, ...(data.posts || [])] : data.posts || []
      );
      setPage(data.page || pageNum);
      setHasMore(Boolean(data.hasMore));
    } catch {
      toast.error('Failed to load explore posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchExplore(1, false);
  }, [fetchExplore]);

  const handlePostUpdated = (updated) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setSelectedPost((prev) => (prev?._id === updated._id ? updated : prev));
  };

  const handlePostDeleted = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
    setSelectedPost(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-6">
      <h1 className="text-xl font-bold mb-5 px-1">Explore</h1>

      {loading ? (
        <Loader label="Discovering posts..." />
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-neutral-500 py-16">
          No posts to explore yet.
        </p>
      ) : (
        <>
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
                      preload="auto"
                    />
                    <span className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white">
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </span>
                  </>
                ) : (
                  <img
                    src={post.mediaUrl}
                    alt={post.caption || 'Explore post'}
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

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => fetchExplore(page + 1, true)}
                className="px-6 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sm font-semibold"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
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

