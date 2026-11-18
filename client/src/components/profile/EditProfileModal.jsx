import { useState, useRef } from 'react';
import { X, Camera, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

export default function EditProfileModal({ open, onClose, onUpdated }) {
  const { user, updateUserState } = useAuth();
  const [tab, setTab] = useState('profile'); // 'profile' | 'password'
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.profilePic || '');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleAvatarChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image file');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('username', username.trim().toLowerCase());
      formData.append('bio', bio);
      formData.append('website', website.trim());
      if (avatarFile) {
        formData.append('profilePic', avatarFile);
      }

      const { data } = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateUserState(data.user);
      toast.success('Profile updated!');
      onUpdated?.(data.user);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await api.put('/users/password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-semibold text-base">Account Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-sm font-medium">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'profile'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500'
            }`}
          >
            <User className="w-4 h-4" /> Edit Profile
          </button>
          <button
            type="button"
            onClick={() => setTab('password')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'password'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500'
            }`}
          >
            <Lock className="w-4 h-4" /> Password
          </button>
        </div>

        {tab === 'profile' ? (
          <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
            <div className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-900 p-3.5 rounded-xl">
              <div className="relative">
                <Avatar src={avatarPreview} alt={username} size="lg" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-ig-blue text-white shadow hover:bg-ig-blueHover"
                  aria-label="Change avatar"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.username}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-ig-blue hover:text-ig-blueHover mt-0.5"
                >
                  Change profile photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-ig-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                pattern="^[a-z0-9._]+$"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-ig-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-ig-blue"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-neutral-500 mb-1">
                <label>Bio</label>
                <span>{bio.length} / 150</span>
              </div>
              <textarea
                rows={3}
                maxLength={150}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ig-blue"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-ig-blue hover:bg-ig-blueHover disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSavePassword} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-ig-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-ig-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-ig-blue"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-ig-blue hover:bg-ig-blueHover disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

