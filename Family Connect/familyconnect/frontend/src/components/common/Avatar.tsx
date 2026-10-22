import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showStatus?: boolean;
  isAlive?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  name, 
  size = 'md', 
  className = '',
  showStatus = false,
  isAlive = true
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-32 h-32 text-3xl',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div 
        className={`${sizes[size]} rounded-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 text-gray-600 font-medium overflow-hidden shadow-sm`}
        title={name}
      >
        {src ? (
          <img 
            src={src} 
            alt={name} 
            className={`w-full h-full object-cover ${!isAlive ? 'grayscale' : ''}`}
            onError={(e) => {
              // Fallback to initials if image fails
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <span className={src ? 'hidden' : ''}>
          {name ? getInitials(name) : <User className="w-1/2 h-1/2 opacity-50" />}
        </span>
      </div>
      
      {/* Optional Status Indicator */}
      {showStatus && isAlive && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-[var(--color-emerald)] ring-2 ring-white" />
      )}
      {showStatus && !isAlive && (
        <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-gray-500 ring-2 ring-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
        </span>
      )}
    </div>
  );
};
