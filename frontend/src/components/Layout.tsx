import React from 'react';
import { Header } from './Header';
import { Sidebar, TabType } from './Sidebar';
import { useStreamContext } from '../context/StreamContext';

interface LayoutProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const { systemStatus, activePersona, isSimulating } = useStreamContext();

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16]">
      <Header 
        status={systemStatus} 
        activePersona={activePersona} 
        isSimulating={isSimulating} 
      />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
