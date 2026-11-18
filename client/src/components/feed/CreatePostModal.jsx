import { useState, useRef, useMemo } from 'react';
import {
  X,
  ImagePlus,
  MapPin,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

const ASPECT_OPTIONS = [
  { label: '1:1', value: '1:1', className: 'aspect-square' },
  { label: '4:5', value: '4:5', className: 'aspect-[4/5]' },
  { label: '16:9', value: '16:9', className: 'aspect-video' },
];

export default function CreatePostModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [hideLikes, setHideLikes] = useState(false);
  const [disableComments, setDisableComments] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const parsedHashtags = useMemo(() => {
    const matches = [...caption.matchAll(/#(\w+)/g)];
    return [...new Set(matches.map((m) => m[1].toLowerCase()))];
  }, [caption]);

  if (!open) return null;

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
    setIsVideo(false);
    setAspectRatio('1:1');
    setCaption('');
    setLocation('');
    setHideLikes(false);
    setDisableComments(false);
    setAdvancedOpen(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = (selected) => {
    if (!selected) return;
    const valid =
      selected.type.startsWith('image/') || selected.type.startsWith('video/');
    if (!valid) {
      toast.error('Only JPEG, PNG, WebP, GIF, MP4, and WebM files are allowed');
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      toast.error('File exceeds the 25MB limit');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setIsVideo(selected.type.startsWith('video/'));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a photo or video to share');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('caption', caption);
      formData.append('location', location);
      formData.append('aspectRatio', aspectRatio);
      formData.append('hideLikes', String(hideLikes));
      formData.append('disableComments', String(disableComments));

      const { data } = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Post shared!');
      onCreated?.(data.post);
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish post');
      setSubmitting(false);
    }
  };

  const currentAspectClass =
    ASPECT_OPTIONS.find((opt) => opt.value === aspectRatio)?.className ||
    'aspect-square';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-semibold text-base">Create new post</h3>
          <button
            type="button"
            disabled={!file || submitting}
            onClick={handleSubmit}
            className="text-sm font-semibold text-ig-blue hover:text-ig-blueHover disabled:opacity-40"
          >
            {submitting ? 'Sharing...' : 'Share'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row min-h-[460px]">
          {/* Left uploader / preview */}
          <div className="md:w-[56%] bg-neutral-50 dark:bg-neutral-900/60 flex flex-col items-center justify-center p-4 relative">
            {!preview ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`w-full h-full min-h-[340px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-ig-blue bg-blue-50/40 dark:bg-blue-950/20'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-ig-blue'
                }`}
              >
                <ImagePlus className="w-14 h-14 text-neutral-400 stroke-[1.5]" />
                <div className="text-center px-6">
                  <p className="text-lg font-medium">
                    Drag photos and videos here
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    JPEG, PNG, WebP, GIF, MP4, or WebM · up to 25MB
                  </p>
                </div>
                <span className="px-4 py-2 rounded-lg bg-ig-blue text-white text-sm font-semibold">
                  Select from computer
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                  onChange={(e) => processFile(e.target.files?.[0])}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-3">
                <div
                  className={`w-full max-h-[420px] ${currentAspectClass} bg-black rounded-xl overflow-hidden flex items-center justify-center`}
                >
                  {isVideo ? (
                    <video
                      src={preview}
                      className="w-full h-full object-cover"
                      controls
                      autoPlay
                      loop
                      muted
                    />
                  ) : (
                    <img
                      src={preview}
                      alt="Upload preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Aspect ratio switcher & change button */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 bg-neutral-200/80 dark:bg-neutral-800 p-1 rounded-lg">
                    {ASPECT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAspectRatio(opt.value)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                          aspectRatio === opt.value
                            ? 'bg-white dark:bg-neutral-950 shadow text-neutral-900 dark:text-white'
                            : 'text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(preview);
                      setFile(null);
                      setPreview('');
                    }}
                    className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  >
                    Change media
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right metadata panel */}
          <div className="md:w-[44%] border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <Avatar src={user?.profilePic} alt={user?.username} size="sm" />
              <span className="text-sm font-semibold">{user?.username}</span>
            </div>

            {/* Caption */}
            <div>
              <textarea
                rows={5}
                maxLength={2200}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption... Use #hashtags to help people discover your post."
                className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-neutral-400"
              />
              <div className="flex items-center justify-between text-xs text-neutral-400 mt-1">
                <span>
                  {parsedHashtags.length > 0
                    ? `${parsedHashtags.length} hashtag${parsedHashtags.length > 1 ? 's' : ''}`
                    : 'Tip: add #tags'}
                </span>
                <span>{caption.length.toLocaleString()} / 2,200</span>
              </div>

              {parsedHashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {parsedHashtags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-ig-blue"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="relative border-y border-neutral-200 dark:border-neutral-800 py-2.5">
              <MapPin className="w-4 h-4 text-neutral-400 absolute right-1 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                className="w-full bg-transparent text-sm pr-7 focus:outline-none"
              />
            </div>

            {/* Advanced Settings */}
            <div>
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                className="w-full flex items-center justify-between text-sm font-medium py-1"
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-neutral-500" />
                  Advanced settings
                </span>
                {advancedOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {advancedOpen && (
                <div className="mt-3 space-y-3">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">Hide like counts</p>
                      <p className="text-xs text-neutral-500">
                        Only you will see the total likes on this post.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={hideLikes}
                      onChange={(e) => setHideLikes(e.target.checked)}
                      className="w-4 h-4 accent-ig-blue rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">Turn off commenting</p>
                      <p className="text-xs text-neutral-500">
                        Disable new comments on this post.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={disableComments}
                      onChange={(e) => setDisableComments(e.target.checked)}
                      className="w-4 h-4 accent-ig-blue rounded"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

