import { useState, useRef } from 'react';
import { X, Upload, Type } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function CreateStoryModal({ open, onClose, onCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  if (!open) return null;

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
    setIsVideo(false);
    setOverlayText('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (selected) => {
    if (!selected) return;
    const valid =
      selected.type.startsWith('image/') || selected.type.startsWith('video/');
    if (!valid) {
      toast.error('Please select an image or video file');
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      toast.error('File exceeds 25MB limit');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setIsVideo(selected.type.startsWith('video/'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Choose an image or video first');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('overlayText', overlayText);

      const { data } = await api.post('/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Added to your story!');
      onCreated?.(data.story);
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload story');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-semibold text-base">Add to your story</h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {!preview ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="h-80 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-ig-blue transition-colors"
            >
              <Upload className="w-10 h-10 text-neutral-400" />
              <div className="text-center">
                <p className="text-sm font-semibold">Select photo or video</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Visible for 24 hours · Max 25MB
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative h-96 rounded-xl overflow-hidden bg-black flex items-center justify-center">
              {isVideo ? (
                <video
                  src={preview}
                  className="w-full h-full object-contain"
                  autoPlay
                  loop
                  muted
                />
              ) : (
                <img
                  src={preview}
                  alt="Story preview"
                  className="w-full h-full object-cover"
                />
              )}
              {overlayText.trim() && (
                <div className="absolute inset-x-4 bottom-8 text-center pointer-events-none">
                  <span className="inline-block px-3 py-1.5 rounded-lg bg-black/60 text-white text-sm font-medium backdrop-blur-sm">
                    {overlayText}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(preview);
                  setFile(null);
                  setPreview('');
                }}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs hover:bg-black/80"
              >
                Change
              </button>
            </div>
          )}

          <div className="relative">
            <Type className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={200}
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="Add overlay text (optional)..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-ig-blue"
            />
          </div>

          <button
            type="submit"
            disabled={!file || submitting}
            className="w-full py-2.5 rounded-xl bg-ig-blue hover:bg-ig-blueHover disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {submitting ? 'Sharing story...' : 'Share to Story'}
          </button>
        </form>
      </div>
    </div>
  );
}

