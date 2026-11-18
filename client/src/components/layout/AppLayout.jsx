import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Search, Heart, Sun, Moon } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import SearchDrawer from './SearchDrawer';
import NotificationDrawer from './NotificationDrawer';
import CreatePostModal from '../feed/CreatePostModal';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';

export default function AppLayout() {
  const [activeDrawer, setActiveDrawer] = useState(null); // null | 'search' | 'notifications'
  const [createOpen, setCreateOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { unreadNotifications } = useSocket();

  const handlePostCreated = (newPost) => {
    window.dispatchEvent(new CustomEvent('ig:post_created', { detail: newPost }));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 h-14 px-4 bg-white/95 dark:bg-black/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <Link to="/" className="font-logo text-[28px] leading-none select-none">
          Instagram
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === 'search' ? null : 'search')}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveDrawer(activeDrawer === 'notifications' ? null : 'notifications')
            }
            className="relative p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Notifications"
          >
            <Heart className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-ig-red" />
            )}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <Sidebar
        activeDrawer={activeDrawer}
        onToggleDrawer={setActiveDrawer}
        onOpenCreate={() => setCreateOpen(true)}
      />

      <SearchDrawer open={activeDrawer === 'search'} onClose={() => setActiveDrawer(null)} />
      <NotificationDrawer
        open={activeDrawer === 'notifications'}
        onClose={() => setActiveDrawer(null)}
      />

      <main className="md:pl-[72px] xl:pl-[244px] pb-16 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      <MobileNav onOpenCreate={() => setCreateOpen(true)} />

      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handlePostCreated}
      />
    </div>
  );
}

