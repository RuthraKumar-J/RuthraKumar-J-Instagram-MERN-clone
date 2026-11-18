import { useState, useEffect } from 'react';
import { BadgeCheck } from 'lucide-react';

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
  '2xl': 'w-28 h-28 md:w-36 md:h-36 text-3xl',
};

export function VerifiedBadge({ className = 'w-3.5 h-3.5' }) {
  return (
    <BadgeCheck
      className={`${className} inline-block text-ig-blue fill-ig-blue stroke-white dark:stroke-black shrink-0`}
      aria-label="Verified"
    />
  );
}

export default function Avatar({
  src,
  alt = 'User',
  size = 'md',
  ring = 'none', // 'none' | 'unseen' | 'seen'
  online = false,
  className = '',
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initials = (alt || 'U').slice(0, 2).toUpperCase();

  const innerContent =
    src && !imgError ? (
      <div
        className={`${sizeClass} rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 ring-1 ring-inset ring-black/10 dark:ring-white/10 shrink-0`}
      >
        <img
          src={src}
          alt={alt}
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center block select-none"
        />
      </div>
    ) : (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center font-semibold text-neutral-700 dark:text-neutral-200 select-none`}
      >
        {initials}
      </div>
    );

  const ringWrapperClass =
    ring === 'unseen'
      ? 'story-gradient-ring p-[2.5px] rounded-full'
      : ring === 'seen'
      ? 'bg-neutral-300 dark:bg-neutral-700 p-[2px] rounded-full'
      : '';

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {ring !== 'none' ? (
        <div className={ringWrapperClass}>
          <div className="bg-white dark:bg-black p-[2px] rounded-full">{innerContent}</div>
        </div>
      ) : (
        innerContent
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black"
          title="Online"
        />
      )}
    </div>
  );
}

