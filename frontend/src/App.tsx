import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { TabType } from './components/Sidebar';
import { ChatMonitorPage } from './pages/ChatMonitor';
import { KnowledgeBasePage } from './pages/KnowledgeBase';
import { PersonaTunerPage } from './pages/PersonaTuner';
import { AnalyticsPage } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';
import { BillingPage } from './pages/Billing';
import { LiveControlPage } from './pages/LiveControl';
import { AuthPage } from './pages/Auth';
import { OnboardingPage } from './pages/Onboarding';
import { LandingPage } from './pages/Landing';
import { AgencyPage } from './pages/Agency';
import { StreamProvider } from './context/StreamContext';
import { fetchMe } from './services/api';

type AppView = 'landing' | 'auth' | 'onboarding' | 'app';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [authed, setAuthed] = useState(Boolean(localStorage.getItem('asa_token')));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (window.location.pathname.includes('/auth/callback') && token) {
      localStorage.setItem('asa_token', token);
      window.history.replaceState({}, '', '/');
      setAuthed(true);
      setView(localStorage.getItem('asa_onboarded') ? 'app' : 'onboarding');
      return;
    }
    if (!authed) return;
    fetchMe()
      .then(() => {
        setView(localStorage.getItem('asa_onboarded') ? 'app' : 'onboarding');
      })
      .catch(() => {
        localStorage.removeItem('asa_token');
        setAuthed(false);
        setView('auth');
      });
  }, [authed]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatMonitorPage />;
      case 'live':
        return <LiveControlPage />;
      case 'kb':
        return <KnowledgeBasePage />;
      case 'persona':
        return <PersonaTunerPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'billing':
        return <BillingPage />;
      case 'agency':
        return <AgencyPage />;
      case 'settings':
        return <SettingsPage />;
      default: {
        const _exhaustive: never = activeTab;
        return _exhaustive;
      }
    }
  };

  if (view === 'landing') {
    return (
      <LandingPage
        onEnter={() => setView(authed ? (localStorage.getItem('asa_onboarded') ? 'app' : 'onboarding') : 'auth')}
      />
    );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-brand-atmosphere">
        <AuthPage
          onAuthed={() => {
            setAuthed(true);
            setView(localStorage.getItem('asa_onboarded') ? 'app' : 'onboarding');
          }}
        />
      </div>
    );
  }

  if (view === 'onboarding') {
    return (
      <div className="min-h-screen bg-brand-atmosphere px-4">
        <OnboardingPage onDone={() => setView('app')} />
      </div>
    );
  }

  return (
    <StreamProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderTabContent()}
      </Layout>
    </StreamProvider>
  );
};

export default App;
