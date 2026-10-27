import React from 'react';
import { Bell, Menu } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { useUIStore } from '../../store/uiStore';

interface TopBarProps {
  onMenuClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { activeTree } = useFamilyStore();
  const { toggleSidebar } = useUIStore();
  const membersCount = useFamilyStore((s) => s.memberIds.length);

  return (
    <header className="family-topbar h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center space-x-3">
        <button
          onClick={onMenuClick || toggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {activeTree?.name ?? 'FamilyConnect'}
          </p>
          {activeTree && (
            <p className="text-xs text-gray-500">
              {membersCount} members
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          aria-label="View notifications"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
        >
          <Bell size={20} className="text-gray-600" />
        </button>
      </div>
    </header>
  );
};
