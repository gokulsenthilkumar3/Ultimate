import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { BudgetView } from './views/BudgetView';
import { WalletsView } from './views/WalletsView';
import { InvestmentsView } from './views/InvestmentsView';
import { BillsView } from './views/BillsView';
import { CardsView } from './views/CardsView';
import { ForexView } from './views/ForexView';
import { SettingsView } from './views/SettingsView';
import { TransferModal } from './components/modals/TransferModal';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { AddBillModal } from './components/modals/AddBillModal';

export const App: React.FC = () => {
  const { activeTab } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'budget':
        return <BudgetView />;
      case 'wallets':
        return <WalletsView />;
      case 'investments':
        return <InvestmentsView />;
      case 'bills':
        return <BillsView />;
      case 'cards':
        return <CardsView />;
      case 'forex':
        return <ForexView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex">
      {/* Sidebar navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main content body */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header setMobileOpen={setMobileOpen} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Modals */}
      <TransferModal />
      <AddTransactionModal />
      <AddBillModal />
    </div>
  );
};

export default App;
