import { useEffect, useState } from 'react';
import { X, Search, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import Avatar, { VerifiedBadge } from '../common/Avatar';
import Loader from '../common/Loader';

export default function SharePostModal({ post, open, onClose }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [note, setNote] = useState('');
  const [sentIds, setSentIds] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get('/messages/conversations')
      .then(({ data }) => {
        setConversations(data.conversations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    api
      .get(`/users/search?q=${encodeURIComponent(trimmed)}`)
      .then(({ data }) => {
        setSearchResults((data.users || []).filter((u) => u._id !== user?._id));
      })
      .catch(() => {});
  }, [debouncedQuery, open, user?._id]);

  if (!open || !post) return null;

  const recipientsFromConvs = conversations
    .map((conv) => ({
      conversationId: conv._id,
      user: conv.participants.find((p) => p._id !== user?._id),
    }))
    .filter((item) => Boolean(item.user));

  const displayList = query.trim()
    ? searchResults.map((u) => ({ conversationId: null, user: u }))
    : recipientsFromConvs;

  const handleSend = async (recipient) => {
    const targetUserId = recipient.user._id;
    setSendingId(targetUserId);
    try {
      let conversationId = recipient.conversationId;
      if (!conversationId) {
        const { data } = await api.post('/messages/conversations', {
          recipientId: targetUserId,
        });
        conversationId = data.conversation._id;
      }

      await api.post(`/messages/${conversationId}`, {
        text: note.trim(),
        sharedPost: post._id,
      });

      setSentIds((prev) => ({ ...prev, [targetUserId]: true }));
      toast.success(`Sent to ${recipient.user.username}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share post');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="w-7" />
          <h3 className="font-semibold text-base">Share</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Recipient list */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900">
          {loading && !query ? (
            <Loader size="sm" />
          ) : displayList.length === 0 ? (
            <div className="py-12 px-6 text-center text-sm text-neutral-500">
              {query.trim()
                ? 'No matching users found.'
                : 'Search for someone above to forward this post.'}
            </div>
          ) : (
            displayList.map((item) => {
              const isSent = Boolean(sentIds[item.user._id]);
              const isSending = sendingId === item.user._id;
              return (
                <div
                  key={item.user._id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={item.user.profilePic}
                      alt={item.user.username}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate flex items-center gap-1">
                        {item.user.username}
                        {item.user.isVerified && <VerifiedBadge />}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {item.user.fullName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSent || isSending}
                    onClick={() => handleSend(item)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isSent
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                        : 'bg-ig-blue hover:bg-ig-blueHover text-white'
                    }`}
                  >
                    {isSent ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Sent
                      </>
                    ) : isSending ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Send
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Optional note */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a message (optional)..."
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

