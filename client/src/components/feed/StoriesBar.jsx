import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

export default function StoriesBar({
  storyGroups = [],
  onOpenStory,
  onOpenCreateStory,
}) {
  const { user } = useAuth();
  const ownGroupIndex = storyGroups.findIndex((g) => g.author?._id === user?._id);
  const ownGroup = ownGroupIndex >= 0 ? storyGroups[ownGroupIndex] : null;
  const otherGroups = storyGroups.filter((g) => g.author?._id !== user?._id);

  return (
    <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
        {/* Your Story / Add Story */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                ownGroup ? onOpenStory(ownGroupIndex) : onOpenCreateStory()
              }
              className="focus:outline-none block"
              aria-label={ownGroup ? 'View your story' : 'Add to your story'}
            >
              <Avatar
                src={user?.profilePic}
                alt={user?.username}
                size="lg"
                ring={ownGroup ? (ownGroup.hasUnseen ? 'unseen' : 'seen') : 'none'}
              />
            </button>
            <button
              type="button"
              onClick={onOpenCreateStory}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-ig-blue hover:bg-ig-blueHover text-white ring-2 ring-white dark:ring-black flex items-center justify-center transition-colors"
              title="Add to your story"
              aria-label="Create story"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
          <span className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate w-full text-center">
            Your story
          </span>
        </div>

        {/* Followed users' stories */}
        {otherGroups.map((group) => {
          const groupIndex = storyGroups.findIndex(
            (g) => g.author?._id === group.author?._id
          );
          return (
            <button
              key={group.author._id}
              type="button"
              onClick={() => onOpenStory(groupIndex)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[72px] group focus:outline-none"
            >
              <Avatar
                src={group.author.profilePic}
                alt={group.author.username}
                size="lg"
                ring={group.hasUnseen ? 'unseen' : 'seen'}
                className="group-hover:scale-105 transition-transform"
              />
              <span className="text-[11px] text-neutral-800 dark:text-neutral-200 truncate w-full text-center">
                {group.author.username}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

