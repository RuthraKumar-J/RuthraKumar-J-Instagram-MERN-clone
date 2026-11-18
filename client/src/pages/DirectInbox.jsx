import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Send,
  Image as ImageIcon,
  SquarePen,
  Search,
  X,
  ArrowLeft,
  MessageCircle,
  Play,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import useDebounce from '../hooks/useDebounce';
import Avatar, { VerifiedBadge } from '../components/common/Avatar';
import PostDetailModal from '../components/feed/PostDetailModal';
import SharePostModal from '../components/feed/SharePostModal';
import Loader from '../components/common/Loader';

export default function DirectInbox() {
  const { user } = useAuth();
  const { socket, isUserOnline, setUnreadMessages } = useSocket();
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const debouncedSearch = useDebounce(searchQuery, 250);

  const [detailPost, setDetailPost] = useState(null);
  const [sharePost, setSharePost] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConvIdRef = useRef(null);

  activeConvIdRef.current = activeConv?._id || null;

  const getOtherParticipant = useCallback(
    (conv) =>
      conv?.participants?.find((p) => p._id !== user?._id) ||
      conv?.participants?.[0],
    [user?._id]
  );

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations');
      const list = data.conversations || [];
      setConversations(list);

      const totalUnread = list.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadMessages(totalUnread);

      const preselectId = location.state?.conversationId;
      if (preselectId) {
        const match = list.find((c) => c._id === preselectId);
        if (match) setActiveConv(match);
      } else if (!activeConvIdRef.current && list.length > 0 && window.innerWidth >= 768) {
        setActiveConv(list[0]);
      }
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, [location.state?.conversationId, setUnreadMessages]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConv?._id) return;
    let cancelled = false;
    setLoadingMsgs(true);
    setTypingUser(null);

    socket?.emit('join_conversation', activeConv._id);

    api
      .get(`/messages/${activeConv._id}`)
      .then(({ data }) => {
        if (!cancelled) {
          setMessages(data.messages || []);
          setConversations((prev) =>
            prev.map((c) =>
              c._id === activeConv._id ? { ...c, unreadCount: 0 } : c
            )
          );
          setUnreadMessages((prev) =>
            Math.max(0, prev - (activeConv.unreadCount || 0))
          );
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load messages');
      })
      .finally(() => {
        if (!cancelled) setLoadingMsgs(false);
      });

    return () => {
      cancelled = true;
      socket?.emit('leave_conversation', activeConv._id);
    };
  }, [activeConv?._id, socket, setUnreadMessages]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  // Socket listeners for live DMs, typing, and seen status
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = ({ conversationId, message }) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conversationId);
        if (!exists) {
          fetchConversations();
          return prev;
        }
        const updated = prev.map((c) => {
          if (c._id !== conversationId) return c;
          const isCurrent = activeConvIdRef.current === conversationId;
          const isOwn = (message.sender?._id || message.sender) === user?._id;
          return {
            ...c,
            lastMessage: message,
            updatedAt: message.createdAt || new Date().toISOString(),
            unreadCount: isCurrent || isOwn ? 0 : (c.unreadCount || 0) + 1,
          };
        });
        return updated.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      });

      if (activeConvIdRef.current === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        const senderId = message.sender?._id || message.sender;
        if (senderId !== user?._id) {
          api.get(`/messages/${conversationId}`).catch(() => {});
        }
      }
    };

    const handleTyping = ({ conversationId, userId, username }) => {
      if (conversationId === activeConvIdRef.current && userId !== user?._id) {
        setTypingUser(username || 'typing');
      }
    };

    const handleStopTyping = ({ conversationId }) => {
      if (conversationId === activeConvIdRef.current) {
        setTypingUser(null);
      }
    };

    const handleMessagesSeen = ({ conversationId, seenBy }) => {
      if (conversationId === activeConvIdRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.seenBy?.includes(seenBy)
              ? m
              : { ...m, seenBy: [...(m.seenBy || []), seenBy] }
          )
        );
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('messages_seen', handleMessagesSeen);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('messages_seen', handleMessagesSeen);
    };
  }, [socket, user?._id, fetchConversations]);

  // Search users for new chat modal
  useEffect(() => {
    if (!newChatOpen) return;
    const trimmed = debouncedSearch.trim();
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
  }, [debouncedSearch, newChatOpen, user?._id]);

  const handleStartConversation = async (recipient) => {
    try {
      const { data } = await api.post('/messages/conversations', {
        recipientId: recipient._id,
      });
      const conv = data.conversation;
      setConversations((prev) => {
        if (prev.some((c) => c._id === conv._id)) return prev;
        return [conv, ...prev];
      });
      setActiveConv(conv);
      setNewChatOpen(false);
      setSearchQuery('');
    } catch {
      toast.error('Could not start conversation');
    }
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    if (!socket || !activeConv) return;
    socket.emit('typing', { conversationId: activeConv._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId: activeConv._id });
    }, 1500);
  };

  const handlePickImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image attachments are supported in chat');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeConv || sending) return;
    if (!text.trim() && !imageFile) return;

    setSending(true);
    socket?.emit('stop_typing', { conversationId: activeConv._id });

    try {
      let response;
      if (imageFile) {
        const formData = new FormData();
        formData.append('text', text.trim());
        formData.append('media', imageFile);
        response = await api.post(`/messages/${activeConv._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post(`/messages/${activeConv._id}`, {
          text: text.trim(),
        });
      }

      const newMsg = response.data.message;
      setMessages((prev) => {
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
      setText('');
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleOpenSharedPost = async (postId) => {
    try {
      const { data } = await api.get(`/posts/${postId}`);
      setDetailPost(data.post);
    } catch {
      toast.error('Post is no longer available');
    }
  };

  const activeOther = activeConv ? getOtherParticipant(activeConv) : null;
  const activeOtherOnline = isUserOnline(activeOther?._id);

  // Determine the last message sent by current user to render "Seen"
  const lastOwnMessageId = [...messages]
    .reverse()
    .find((m) => (m.sender?._id || m.sender) === user?._id)?._id;

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen flex bg-white dark:bg-black">
      {/* Left Conversation List */}
      <section
        className={`w-full md:w-[340px] lg:w-[370px] border-r border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0 ${
          activeConv ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="h-16 px-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <span className="font-bold text-lg truncate">{user?.username}</span>
          <button
            type="button"
            onClick={() => setNewChatOpen(true)}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            title="New message"
            aria-label="New message"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 text-sm font-semibold text-neutral-500">
          Messages
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <Loader size="sm" />
          ) : conversations.length === 0 ? (
            <div className="px-6 py-16 text-center space-y-3">
              <p className="text-sm text-neutral-500">No conversations yet.</p>
              <button
                type="button"
                onClick={() => setNewChatOpen(true)}
                className="px-4 py-2 rounded-lg bg-ig-blue text-white text-xs font-semibold"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isSelected = activeConv?._id === conv._id;
              const online = isUserOnline(other?._id);
              const previewText = conv.lastMessage
                ? conv.lastMessage.text ||
                  (conv.lastMessage.sharedPost
                    ? 'Shared a post'
                    : conv.lastMessage.mediaUrl
                    ? 'Sent a photo'
                    : '')
                : 'Start chatting';

              return (
                <button
                  key={conv._id}
                  type="button"
                  onClick={() => setActiveConv(conv)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-900'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                  }`}
                >
                  <Avatar
                    src={other?.profilePic}
                    alt={other?.username}
                    size="md"
                    online={online}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate flex items-center gap-1">
                        {other?.username}
                        {other?.isVerified && <VerifiedBadge className="w-3 h-3" />}
                      </p>
                      {conv.lastMessage?.createdAt && (
                        <span className="text-[11px] text-neutral-400 shrink-0">
                          {formatDistanceToNowStrict(
                            new Date(conv.lastMessage.createdAt)
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p
                        className={`text-xs truncate ${
                          conv.unreadCount > 0
                            ? 'font-semibold text-neutral-900 dark:text-white'
                            : 'text-neutral-500'
                        }`}
                      >
                        {previewText}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-ig-blue shrink-0" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Right Active Chat Pane */}
      <section
        className={`flex-1 flex flex-col min-w-0 ${
          activeConv ? 'flex' : 'hidden md:flex'
        }`}
      >
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
            <div className="w-20 h-20 rounded-full border-2 border-neutral-900 dark:border-white flex items-center justify-center">
              <MessageCircle className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h2 className="text-xl font-semibold">Your messages</h2>
            <p className="text-sm text-neutral-500 max-w-xs">
              Send private photos, shared posts, and real-time messages to friends.
            </p>
            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="mt-2 px-5 py-2 rounded-lg bg-ig-blue hover:bg-ig-blueHover text-white text-sm font-semibold"
            >
              Send message
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-16 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveConv(null)}
                  className="md:hidden p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Link
                  to={`/profile/${activeOther?.username}`}
                  className="flex items-center gap-3 min-w-0"
                >
                  <Avatar
                    src={activeOther?.profilePic}
                    alt={activeOther?.username}
                    size="sm"
                    online={activeOtherOnline}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1">
                      {activeOther?.username}
                      {activeOther?.isVerified && <VerifiedBadge />}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {activeOtherOnline ? 'Active now' : activeOther?.fullName}
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs ? (
                <Loader size="sm" />
              ) : messages.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Avatar
                    src={activeOther?.profilePic}
                    alt={activeOther?.username}
                    size="xl"
                    className="mx-auto"
                  />
                  <p className="font-semibold text-base pt-2">
                    {activeOther?.fullName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    @{activeOther?.username} · Say hello!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = (msg.sender?._id || msg.sender) === user?._id;
                  const seenByOther = (msg.seenBy || []).some(
                    (id) => id.toString() === activeOther?._id?.toString()
                  );

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${
                        isOwn ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`flex items-end gap-2 max-w-[78%] sm:max-w-[65%] ${
                          isOwn ? 'flex-row-reverse' : 'flex-row'
                        }`}
                      >
                        {!isOwn && (
                          <Avatar
                            src={msg.sender?.profilePic}
                            alt={msg.sender?.username}
                            size="xs"
                          />
                        )}

                        <div className="space-y-1.5">
                          {/* Shared post preview card */}
                          {msg.sharedPost && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSharedPost(msg.sharedPost._id)
                              }
                              className="block w-56 sm:w-64 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-left hover:opacity-95 transition-opacity"
                            >
                              <div className="flex items-center gap-2 px-3 py-2">
                                <Avatar
                                  src={msg.sharedPost.author?.profilePic}
                                  alt={msg.sharedPost.author?.username}
                                  size="xs"
                                />
                                <span className="text-xs font-semibold truncate">
                                  {msg.sharedPost.author?.username}
                                </span>
                              </div>
                              <div className="relative aspect-square bg-black">
                                {msg.sharedPost.mediaType === 'video' ? (
                                  <>
                                    <video
                                      src={msg.sharedPost.mediaUrl}
                                      className="w-full h-full object-cover"
                                      muted
                                    />
                                    <span className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white">
                                      <Play className="w-3 h-3 fill-white" />
                                    </span>
                                  </>
                                ) : (
                                  <img
                                    src={msg.sharedPost.mediaUrl}
                                    alt="Shared post"
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              {msg.sharedPost.caption && (
                                <p className="px-3 py-2 text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2">
                                  {msg.sharedPost.caption}
                                </p>
                              )}
                            </button>
                          )}

                          {/* Image attachment */}
                          {msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt="Attachment"
                              className="max-w-[260px] rounded-2xl border border-neutral-200 dark:border-neutral-800 object-cover"
                            />
                          )}

                          {/* Text bubble */}
                          {msg.text && (
                            <div
                              className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                                isOwn
                                  ? 'bg-ig-blue text-white rounded-br-sm'
                                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'
                              }`}
                            >
                              {msg.text}
                            </div>
                          )}
                        </div>
                      </div>

                      {isOwn && msg._id === lastOwnMessageId && seenByOther && (
                        <span className="text-[10px] text-neutral-400 mt-1 mr-1">
                          Seen
                        </span>
                      )}
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUser && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Avatar
                    src={activeOther?.profilePic}
                    alt={activeOther?.username}
                    size="xs"
                  />
                  <div className="px-3.5 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
              {imagePreview && (
                <div className="relative inline-block mb-2 ml-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-20 rounded-xl object-cover border border-neutral-300 dark:border-neutral-700"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(imagePreview);
                      setImageFile(null);
                      setImagePreview('');
                    }}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-black text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500"
                  aria-label="Attach image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handlePickImage(e.target.files?.[0])}
                  className="hidden"
                />

                <input
                  type="text"
                  value={text}
                  onChange={handleInputChange}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-sm py-1.5 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={sending || (!text.trim() && !imageFile)}
                  className="px-3 py-1.5 rounded-full bg-ig-blue hover:bg-ig-blueHover disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </div>
          </>
        )}
      </section>

      {/* New message modal */}
      {newChatOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setNewChatOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="w-7" />
              <h3 className="font-semibold text-base">New message</h3>
              <button
                type="button"
                onClick={() => setNewChatOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people by username or name..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto py-2">
              {!searchQuery.trim() ? (
                <p className="text-center text-xs text-neutral-500 py-10">
                  Type a name or username to start chatting.
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-xs text-neutral-500 py-10">
                  No users found.
                </p>
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => handleStartConversation(u)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-left"
                  >
                    <Avatar src={u.profilePic} alt={u.username} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate flex items-center gap-1">
                        {u.username}
                        {u.isVerified && <VerifiedBadge />}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {u.fullName}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <PostDetailModal
        post={detailPost}
        open={Boolean(detailPost)}
        onClose={() => setDetailPost(null)}
        onPostUpdated={(u) => setDetailPost(u)}
        onPostDeleted={() => setDetailPost(null)}
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

