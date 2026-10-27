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
    <div className="family-shell flex h-screen bg-[var(--color-cream)] overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 w-full overflow-hidden">
        <TopBar />
        <main className="family-main flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  );
};
