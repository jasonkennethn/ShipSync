import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthPage } from './pages/AuthPage';
import { UserPortal } from './pages/UserPortal';
import { DeliveryProviderPortal } from './pages/DeliveryProviderPortal';
import { TrackParcelModal } from './components/TrackParcelModal';
import { DemoSeedModal } from './components/DemoSeedModal';
import { RefreshCw } from 'lucide-react';

const MainLayout = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-apple-grid text-apple-500 font-sans">
        <RefreshCw size={24} className="animate-spin text-apple-900 mb-3" />
        <p className="text-xs font-medium tracking-wide text-apple-800">Initializing ShipSync...</p>
      </div>
    );
  }

  const renderPortal = () => {
    if (!isAuthenticated || !user) {
      return <AuthPage />;
    }

    // 2 Portals: Delivery Provider (Manager/Agent) and User (Sender/Recipient)
    if (user.role === 'agent' || user.role === 'delivery_agent') {
      return <DeliveryProviderPortal />;
    }

    return <UserPortal />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-apple-grid text-apple-900 selection:bg-black selection:text-white overscroll-none">
      <Navbar
        onOpenTrackModal={() => setIsTrackModalOpen(true)}
        onOpenDemoSeedModal={() => setIsDemoModalOpen(true)}
      />

      <main className="flex-1 pb-16 lg:pb-0">
        {renderPortal()}
      </main>

      <Footer />

      {/* Global Modals */}
      <TrackParcelModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />

      <DemoSeedModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
