import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Clock } from 'lucide-react';
import api from '../../api/axios';
import useDebounce from '../../hooks/useDebounce';
import Avatar, { VerifiedBadge } from '../common/Avatar';
import Loader from '../common/Loader';

const RECENT_KEY = 'ig_recent_searches';

export default function SearchDrawer({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!open) return;
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .get(`/users/search?q=${encodeURIComponent(trimmed)}`)
      .then(({ data }) => {
        if (!cancelled) {
          setResults(data.users || []);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  const saveRecent = (user) => {
    const updated = [user, ...recentSearches.filter((item) => item._id !== user._id)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const removeRecent = (e, userId) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = recentSearches.filter((item) => item._id !== userId);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_KEY);
  };

  if (!open) return null;

  const isSearching = query.trim().length > 0;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/20 md:bg-transparent"
        onClick={onClose}
      />
      <aside className="fixed top-0 bottom-0 left-0 md:left-[72px] z-40 w-full max-w-[396px] bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 shadow-2xl md:rounded-r-2xl flex flex-col">
        <div className="px-6 pt-6 pb-5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Search</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search accounts..."
              autoFocus
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-neutral-300 dark:bg-neutral-700 text-white dark:text-black"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {isSearching ? (
            loading ? (
              <Loader size="sm" />
            ) : results.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-neutral-500">
                No accounts found for &ldquo;{query}&rdquo;.
              </div>
            ) : (
              <div>
                {results.map((u) => (
                  <Link
                    key={u._id}
                    to={`/profile/${u.username}`}
                    onClick={() => {
                      saveRecent(u);
                      onClose();
                    }}
                    className="flex items-center gap-3 px-6 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <Avatar src={u.profilePic} alt={u.username} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold truncate">{u.username}</span>
                        {u.isVerified && <VerifiedBadge />}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {u.fullName}
                        {Array.isArray(u.followers) ? ` · ${u.followers.length} followers` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div>
              <div className="flex items-center justify-between px-6 py-2">
                <span className="text-sm font-semibold">Recent</span>
                {recentSearches.length > 0 && (
                  <button
                    onClick={clearAllRecent}
                    className="text-xs font-semibold text-ig-blue hover:text-ig-blueHover"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {recentSearches.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-neutral-500 flex flex-col items-center gap-2">
                  <Clock className="w-6 h-6 text-neutral-400" />
                  <span>No recent searches.</span>
                </div>
              ) : (
                recentSearches.map((u) => (
                  <Link
                    key={u._id}
                    to={`/profile/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-6 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors group"
                  >
                    <Avatar src={u.profilePic} alt={u.username} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold truncate">{u.username}</span>
                        {u.isVerified && <VerifiedBadge />}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {u.fullName}
                      </p>
                    </div>
                    <button
                      onClick={(e) => removeRecent(e, u._id)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      aria-label="Remove recent search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

