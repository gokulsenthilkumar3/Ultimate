import React from 'react';
import type { RelationshipType } from '../../types/family';

interface BadgeProps {
  type: RelationshipType | 'neutral' | 'success' | 'warning' | 'danger';
  label?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, label, className = '' }) => {
  // Map relationship types to colors based on the PRD palette
  const getColorScheme = () => {
    switch (type) {
      case 'parent':
      case 'child':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'spouse':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'sibling':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'aunt_uncle':
      case 'niece_nephew':
      case 'cousin':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'inlaw':
      case 'step_parent':
      case 'step_child':
      case 'adopted':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'friend':
      case 'mentor':
      case 'godparent':
        return 'bg-green-100 text-green-800 border-green-200';
      
      // Generic UI variants
      case 'success': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'danger': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'neutral':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const displayLabel = label || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColorScheme()} ${className}`}>
      {displayLabel}
    </span>
  );
};
