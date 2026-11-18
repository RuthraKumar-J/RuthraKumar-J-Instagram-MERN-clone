export default function Loader({ fullScreen = false, size = 'md', label = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-2',
    lg: 'w-10 h-10 border-[3px]',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${
          sizeClasses[size] || sizeClasses.md
        } rounded-full border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white animate-spin`}
      />
      {label && (
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-black">
        <span className="font-logo text-5xl mb-6 text-neutral-900 dark:text-white select-none">
          Instagram
        </span>
        {spinner}
      </div>
    );
  }

  return <div className="py-8 flex items-center justify-center w-full">{spinner}</div>;
}

