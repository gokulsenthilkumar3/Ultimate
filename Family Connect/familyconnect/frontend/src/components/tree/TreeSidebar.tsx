import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useFamilyStore, selectMembers } from '../../store/familyStore';
import { Avatar } from '../common/Avatar';
import type { Member } from '../../types/family';

interface TreeSidebarProps {
  onSelectMember: (id: string) => void;
}

export const TreeSidebar: React.FC<TreeSidebarProps> = ({ onSelectMember }) => {
  const members = useFamilyStore(selectMembers);
  
  return (
    <div className="absolute left-4 top-4 bottom-4 w-64 bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 rounded-2xl z-10 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 mb-3">Family Members</h3>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </div>
          <input 
            type="text" 
            placeholder="Search..." 
            className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[var(--color-saffron)] outline-none transition-colors"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {members.map((member: Member) => (
          <div 
            key={member.id}
            onClick={() => onSelectMember(member.id)}
            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          >
            <Avatar name={member.name} src={member.photoUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
              <p className="text-xs text-gray-500 truncate">{member.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown'}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500 font-medium">
        <span>Total: {members.length}</span>
        <button className="flex items-center hover:text-gray-900">
          <Filter size={14} className="mr-1" /> Filters
        </button>
      </div>
    </div>
  );
};
