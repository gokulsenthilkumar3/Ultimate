import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useFamilyData } from '../../hooks/useFamilyData';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  useFamilyData();

  return (
    <div className="flex h-screen bg-[var(--color-cream)] overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  );
};
