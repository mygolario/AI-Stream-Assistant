import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { TabType } from './components/Sidebar';
import { ChatMonitorPage } from './pages/ChatMonitor';
import { KnowledgeBasePage } from './pages/KnowledgeBase';
import { PersonaTunerPage } from './pages/PersonaTuner';
import { AnalyticsPage } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';
import { StreamProvider } from './context/StreamContext';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatMonitorPage />;
      case 'kb':
        return <KnowledgeBasePage />;
      case 'persona':
        return <PersonaTunerPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <ChatMonitorPage />;
    }
  };

  return (
    <StreamProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderTabContent()}
      </Layout>
    </StreamProvider>
  );
};

export default App;
