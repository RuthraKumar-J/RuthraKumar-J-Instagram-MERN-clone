import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import Avatar, { VerifiedBadge } from '../common/Avatar';
import Loader from '../common/Loader';

export default function NotificationDrawer({ open, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { setUnreadNotifications, latestNotification } = useSocket();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    api
      .get('/notifications')
      .then(({ data }) => {
        if (!cancelled) {
          setNotifications(data.notifications || []);
          if ((data.unreadCount || 0) > 0) {
            api.put('/notifications/read-all').catch(() => {});
            setUnreadNotifications(0);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, setUnreadNotifications]);

  useEffect(() => {
    if (open && latestNotification) {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === latestNotification._id)) return prev;
        return [latestNotification, ...prev];
      });
      api.put('/notifications/read-all').catch(() => {});
      setUnreadNotifications(0);
    }
  }, [latestNotification, open, setUnreadNotifications]);

  if (!open) return null;

  const getTypeIcon = (type) => {
    if (type === 'like') return <Heart className="w-3.5 h-3.5 text-ig-red fill-ig-red" />;
    if (type === 'follow') return <UserPlus className="w-3.5 h-3.5 text-ig-blue" />;
    return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/20 md:bg-transparent"
        onClick={onClose}
      />
      <aside className="fixed top-0 bottom-0 left-0 md:left-[72px] z-40 w-full max-w-[396px] bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 shadow-2xl md:rounded-r-2xl flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <Loader size="sm" />
          ) : notifications.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-neutral-500">
              No activity yet. Likes, comments, and new followers will appear here.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif._id}
                className={`flex items-center gap-3 px-6 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900/70 transition-colors ${
                  !notif.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                }`}
              >
                <Link
                  to={`/profile/${notif.sender?.username}`}
                  onClick={onClose}
                  className="relative shrink-0"
                >
                  <Avatar
                    src={notif.sender?.profilePic}
                    alt={notif.sender?.username}
                    size="md"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-black rounded-full p-0.5 shadow">
                    {getTypeIcon(notif.type)}
                  </span>
                </Link>

                <div className="min-w-0 flex-1 text-sm leading-snug">
                  <Link
                    to={`/profile/${notif.sender?.username}`}
                    onClick={onClose}
                    className="font-semibold hover:underline inline-flex items-center gap-1 mr-1"
                  >
                    {notif.sender?.username}
                    {notif.sender?.isVerified && <VerifiedBadge className="w-3 h-3" />}
                  </Link>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {notif.text ||
                      (notif.type === 'like'
                        ? 'liked your post.'
                        : notif.type === 'follow'
                        ? 'started following you.'
                        : 'commented on your post.')}
                  </span>
                  <span className="ml-1.5 text-xs text-neutral-400">
                    {notif.createdAt
                      ? formatDistanceToNowStrict(new Date(notif.createdAt))
                      : ''}
                  </span>
                </div>

                {notif.post?.mediaUrl && (
                  <Link
                    to={`/profile/${notif.sender?.username}`}
                    onClick={onClose}
                    className="w-11 h-11 rounded-md overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-900"
                  >
                    {notif.post.mediaType === 'video' ? (
                      <video
                        src={notif.post.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={notif.post.mediaUrl}
                        alt="Post thumbnail"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}

