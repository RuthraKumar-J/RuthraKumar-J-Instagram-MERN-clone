import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar, { VerifiedBadge } from '../common/Avatar';

export default function FollowListModal({
  title,
  users = [],
  open,
  onClose,
  onFollowChanged,
}) {
  const { user, updateUserState } = useAuth();
  const [busyId, setBusyId] = useState(null);

  if (!open) return null;

  const followingSet = new Set(
    (user?.following || []).map((id) => (typeof id === 'string' ? id : id._id))
  );

  const handleToggleFollow = async (targetUserId) => {
    setBusyId(targetUserId);
    try {
      const { data } = await api.post(`/users/${targetUserId}/follow`);
      updateUserState((prev) => {
        const current = (prev.following || []).map((id) =>
          typeof id === 'string' ? id : id._id
        );
        const updated = data.following
          ? [...new Set([...current, targetUserId])]
          : current.filter((id) => id !== targetUserId);
        return { ...prev, following: updated };
      });
      onFollowChanged?.();
    } catch {
      toast.error('Failed to update follow status');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xl max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="w-7" />
          <h3 className="font-semibold text-base">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {users.length === 0 ? (
            <p className="text-center text-sm text-neutral-500 py-12">
              No accounts to show.
            </p>
          ) : (
            users.map((item) => {
              const isSelf = item._id === user?._id;
              const isFollowing = followingSet.has(item._id);
              return (
                <div
                  key={item._id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                >
                  <Link
                    to={`/profile/${item.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <Avatar src={item.profilePic} alt={item.username} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate flex items-center gap-1">
                        {item.username}
                        {item.isVerified && <VerifiedBadge />}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {item.fullName}
                      </p>
                    </div>
                  </Link>

                  {!isSelf && (
                    <button
                      type="button"
                      disabled={busyId === item._id}
                      onClick={() => handleToggleFollow(item._id)}
                      className={`ml-3 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isFollowing
                          ? 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                          : 'bg-ig-blue hover:bg-ig-blueHover text-white'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

