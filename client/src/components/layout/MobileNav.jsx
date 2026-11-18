import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Clapperboard,
  PlusSquare,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../common/Avatar';

export default function MobileNav({ onOpenCreate }) {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadMessages } = useSocket();

  const iconClass = (active) =>
    `p-2 rounded-lg transition-colors ${
      active
        ? 'text-neutral-950 dark:text-white scale-105'
        : 'text-neutral-600 dark:text-neutral-400'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 dark:bg-black/95 backdrop-blur border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around px-2">
      <Link to="/" className={iconClass(location.pathname === '/')} aria-label="Home">
        <Home className="w-6 h-6" />
      </Link>

      <Link
        to="/explore"
        className={iconClass(location.pathname.startsWith('/explore'))}
        aria-label="Explore"
      >
        <Compass className="w-6 h-6" />
      </Link>

      <Link to="/reels" className={iconClass(location.pathname === '/reels')} aria-label="Reels">
        <Clapperboard className="w-6 h-6" />
      </Link>

      <button
        type="button"
        onClick={onOpenCreate}
        className={iconClass(false)}
        aria-label="Create post"
      >
        <PlusSquare className="w-6 h-6" />
      </button>

      <Link
        to="/direct/inbox"
        className={`relative ${iconClass(location.pathname.startsWith('/direct'))}`}
        aria-label="Messages"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadMessages > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-ig-red" />
        )}
      </Link>

      <Link
        to={`/profile/${user?.username}`}
        className={iconClass(location.pathname === `/profile/${user?.username}`)}
        aria-label="Profile"
      >
        <Avatar src={user?.profilePic} alt={user?.username} size="xs" />
      </Link>
    </nav>
  );
}

