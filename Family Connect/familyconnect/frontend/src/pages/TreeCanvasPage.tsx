import React from 'react';
import { TreeCanvas } from '../components/tree/TreeCanvas';

export const TreeCanvasPage: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Tree</h1>
          <p className="text-gray-500 text-sm">Interactive view of your family connections.</p>
        </div>
      </div>
      
      <div className="flex-1 w-full relative">
        <TreeCanvas />
      </div>
    </div>
  );
};
