import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  Compass,
  Clapperboard,
  MessageCircle,
  Heart,
  PlusSquare,
  Sun,
  Moon,
  LogOut,
  Instagram,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../common/Avatar';

export default function Sidebar({
  activeDrawer,
  onToggleDrawer,
  onOpenCreate,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { unreadNotifications, unreadMessages } = useSocket();

  const isCollapsed = Boolean(activeDrawer);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemClass = (active) =>
    `group flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-150 cursor-pointer w-full text-left ${
      active
        ? 'font-bold bg-neutral-100/80 dark:bg-neutral-900'
        : 'font-normal hover:bg-neutral-100 dark:hover:bg-neutral-900'
    }`;

  return (
    <aside
      className={`hidden md:flex flex-col justify-between fixed top-0 left-0 bottom-0 z-40 bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 px-3 py-5 transition-all duration-200 ${
        isCollapsed ? 'w-[72px]' : 'w-[72px] xl:w-[244px]'
      }`}
    >
      <div>
        {/* Brand */}
        <Link
          to="/"
          onClick={() => onToggleDrawer(null)}
          className="flex items-center h-12 px-3 mb-5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
        >
          <Instagram className={`w-6 h-6 shrink-0 ${isCollapsed ? 'block' : 'block xl:hidden'}`} />
          {!isCollapsed && (
            <span className="hidden xl:block font-logo text-[32px] leading-none tracking-wide select-none">
              Instagram
            </span>
          )}
        </Link>

        {/* Primary navigation */}
        <nav className="space-y-1">
          <Link
            to="/"
            onClick={() => onToggleDrawer(null)}
            className={navItemClass(location.pathname === '/' && !activeDrawer)}
          >
            <Home className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
            {!isCollapsed && <span className="hidden xl:inline text-[15px]">Home</span>}
          </Link>

          <button
            type="button"
            onClick={() => onToggleDrawer(activeDrawer === 'search' ? null : 'search')}
            className={navItemClass(activeDrawer === 'search')}
          >
            <Search className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
            {!isCollapsed && <span className="hidden xl:inline text-[15px]">Search</span>}
          </button>

          <Link
            to="/explore"
            onClick={() => onToggleDrawer(null)}
            className={navItemClass(location.pathname.startsWith('/explore') && !activeDrawer)}
          >
            <Compass className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
            {!isCollapsed && <span className="hidden xl:inline text-[15px]">Explore</span>}
          </Link>

          <Link
            to="/reels"
            onClick={() => onToggleDrawer(null)}
            className={navItemClass(location.pathname === '/reels' && !activeDrawer)}
          >
            <Clapperboard className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
            {!isCollapsed && <span className="hidden xl:inline text-[15px]">Reels</span>}
          </Link>

          <Link
            to="/direct/inbox"
            onClick={() => onToggleDrawer(null)}
            className={navItemClass(location.pathname.startsWith('/direct') && !activeDrawer)}
          >
            <div className="relative shrink-0">
              <MessageCircle className="w-6 h-6 group-hover:scale-105 transition-transform" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-ig-red text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </div>
            {!isCollapsed && <span className="hidden xl:inline text-[15px]">Messages</span>}
          </Link>

          <button
            type="button"
            onClick={() =>
              onToggleDrawer(activeDrawer === 'notifications' ? null : 'notifications')
            }
            className={navItemClass(activeDrawer === 'notifications')}
          >
            <div className="relative shrink-0">
              <Heart className="w-6 h-6 group-hover:scale-105 transition-transform" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-ig-red text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </div>
            {!isCollapsed && <span className="hidden xl:inline text-[15px]">Notifications</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleDrawer(null);
              onOpenCreate();
            }}
            className={navItemClass(false)}
          >
            <PlusSquare className="w-6 h-6 shrink-0 group-hover:scale-105 transition-transform" />
            {!isCollapsed && <span className="hidden xl:inline text-[15px]">Create</span>}
          </button>

          <Link
            to={`/profile/${user?.username}`}
            onClick={() => onToggleDrawer(null)}
            className={navItemClass(
              location.pathname === `/profile/${user?.username}` && !activeDrawer
            )}
          >
            <Avatar src={user?.profilePic} alt={user?.username} size="xs" />
            {!isCollapsed && <span className="hidden xl:inline text-[15px]">Profile</span>}
          </Link>
        </nav>
      </div>

      {/* Bottom controls */}
      <div className="space-y-1 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <button type="button" onClick={toggleTheme} className={navItemClass(false)}>
          {isDark ? (
            <Sun className="w-6 h-6 shrink-0 text-amber-400" />
          ) : (
            <Moon className="w-6 h-6 shrink-0" />
          )}
          {!isCollapsed && (
            <span className="hidden xl:inline text-[15px]">
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="group flex items-center gap-4 px-3 py-3 rounded-xl transition-colors w-full text-left text-neutral-600 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
        >
          <LogOut className="w-6 h-6 shrink-0" />
          {!isCollapsed && <span className="hidden xl:inline text-[15px]">Log out</span>}
        </button>
      </div>
    </aside>
  );
}

