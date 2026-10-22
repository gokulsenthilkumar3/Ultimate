import React from 'react';
import { Avatar } from '../common/Avatar';
import type { Member } from '../../types/family';
import { MapPin, Briefcase } from 'lucide-react';

interface MemberCardProps {
  member: Member;
  onClick?: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, onClick }) => {
  return (
    <div 
      className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex"
      onClick={onClick}
    >
      {/* Side Accent Bar */}
      <div className={`w-1.5 flex-shrink-0 transition-colors ${member.gender === 'female' ? 'bg-pink-400 group-hover:bg-pink-500' : member.gender === 'male' ? 'bg-blue-400 group-hover:bg-blue-500' : 'bg-purple-400 group-hover:bg-purple-500'}`} />
      
      <div className="p-4 flex items-center space-x-4 flex-1 bg-gradient-to-br from-white to-gray-50/50">
        <Avatar 
          name={member.name} 
          src={member.photoUrl} 
          size="lg" 
          isAlive={member.isAlive}
          showStatus
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate">{member.name}</h3>
          
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm text-gray-500">
              {member.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown'} 
              {member.deathDate ? ` - ${new Date(member.deathDate).getFullYear()}` : (member.isAlive === false ? ' - Deceased' : ' - Present')}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className="text-sm text-gray-500 capitalize">{member.gender}</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {member.occupation && (
              <span className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                <Briefcase size={12} className="mr-1" />
                {member.occupation}
              </span>
            )}
            {member.birthLocation && (
              <span className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                <MapPin size={12} className="mr-1" />
                {member.birthLocation}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
