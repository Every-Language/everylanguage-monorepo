import React from 'react';
import { useSidebarCollapsed } from '../../stores/sidebar';

interface MainContentProps {
  children: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const isCollapsed = useSidebarCollapsed();

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-0' : 'ml-64'}`}>
      <main className='flex-1 overflow-auto'>{children}</main>
    </div>
  );
};
