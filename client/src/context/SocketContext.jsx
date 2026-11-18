import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);

  const refreshUnreadCounts = useCallback(async () => {
    if (!token) return;
    try {
      const [notifRes, convRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/messages/conversations'),
      ]);
      setUnreadNotifications(notifRes.data.unreadCount || 0);
      const totalUnreadMsgs = (convRes.data.conversations || []).reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );
      setUnreadMessages(totalUnreadMsgs);
    } catch {
      // Ignore transient errors on initial load
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      setOnlineUsers([]);
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    refreshUnreadCounts();

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    newSocket.on('online_users', (users) => {
      setOnlineUsers(users || []);
    });

    newSocket.on('new_notification', (notification) => {
      setLatestNotification(notification);
      setUnreadNotifications((prev) => prev + 1);
      if (notification?.sender?.username) {
        toast(`${notification.sender.username} ${notification.text || 'interacted with you'}`, {
          icon: '🔔',
        });
      }
    });

    newSocket.on('message_received', ({ message }) => {
      const senderId = message?.sender?._id || message?.sender;
      if (senderId && senderId !== user._id) {
        if (!window.location.pathname.startsWith('/direct')) {
          setUnreadMessages((prev) => prev + 1);
          toast(`New message from ${message.sender?.username || 'someone'}`, {
            icon: '💬',
          });
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?._id, refreshUnreadCounts]);

  const isUserOnline = useCallback(
    (userId) => Boolean(userId && onlineUsers.includes(userId.toString())),
    [onlineUsers]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        isUserOnline,
        unreadNotifications,
        setUnreadNotifications,
        unreadMessages,
        setUnreadMessages,
        latestNotification,
        refreshUnreadCounts,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};

