import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { NodeProps, Node } from '@xyflow/react';
import { Avatar } from '../common/Avatar';
import type { Member } from '../../types/family';

export type MemberNodeType = Node<Member & Record<string, unknown>, 'member'>;

// ─── Animation variants (defined outside component to avoid recreation) ───────
const variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
};

const MemberNodeInner: React.FC<NodeProps<MemberNodeType>> = ({ data, selected }) => {
  const birthYear = data.birthDate ? new Date(data.birthDate).getFullYear() : 'Unknown';
  const deathYear = data.deathDate
    ? ` - ${new Date(data.deathDate).getFullYear()}`
    : data.isAlive === false
    ? ' - Deceased'
    : '';

  const genderColor =
    data.gender === 'female'
      ? 'bg-pink-400'
      : data.gender === 'male'
      ? 'bg-blue-400'
      : 'bg-purple-400';

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      className={`relative w-56 shadow-lg rounded-2xl bg-white/90 backdrop-blur-md border border-white transition-all overflow-hidden ${
        selected ? 'ring-2 ring-[var(--color-saffron)] shadow-xl scale-105' : 'hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      <div className={`h-1.5 w-full ${genderColor}`} />

      <div className="p-4 flex items-center space-x-3">
        <Avatar name={data.name} src={data.photoUrl} size="md" isAlive={data.isAlive} showStatus />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{data.name}</p>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className="text-xs text-gray-500 truncate">
              {birthYear}{deathYear}
            </span>
          </div>
          {data.occupation && (
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-1 truncate">
              {data.occupation}
            </p>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </motion.div>
  );
};

// memo prevents re-render unless this node's own data/selected state changes
export const MemberNode = memo(MemberNodeInner);
