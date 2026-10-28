import React from 'react';
import { Metrics } from '../components';
import { money } from '../models/financeModel';
import { SAMPLE_HOLDINGS, SAMPLE_PORTFOLIO_COST, SAMPLE_PORTFOLIO_VALUE } from '../models/portfolioModel';
import SetupScreen from './SetupScreen';
import PortfolioScreen from './PortfolioScreen';
import SIPScreen from './SIPScreen';
import { BudgetRecords, ShoppingRecords, SubscriptionRecords, TransactionRecords } from './FinanceRecords';

export default function FinanceScreen({ page, view, added = [], openRecord, subscriptionEntries = [] }) {
  if (page.id === 'financeSync') return <SetupScreen title="Connect your financial accounts" text="Bring authorised data into your personal workspace. Customer administration lives in the customer section." items={['Bank connections · setup required', 'CSV import · preview', 'Import history']} />;
  if (page.id === 'sip') return <SIPScreen view={view} />;
  if (page.id === 'budgeting') return <BudgetRecords view={view} added={added} openRecord={openRecord} />;
  if (page.id === 'subscriptions') return <SubscriptionRecords view={view} added={added} openRecord={openRecord} />;
  if (page.id === 'shopping') return <ShoppingRecords view={view} added={added} openRecord={openRecord} />;
  if (page.id === 'portfolio') return <><Metrics items={[{ label: 'Portfolio value', value: money(SAMPLE_PORTFOLIO_VALUE), detail: 'sample holdings' }, { label: 'Invested', value: money(SAMPLE_PORTFOLIO_COST), detail: 'sample cost basis' }, { label: 'Change', value: `+${((SAMPLE_PORTFOLIO_VALUE / SAMPLE_PORTFOLIO_COST - 1) * 100).toFixed(2)}%`, detail: 'illustrative return' }, { label: 'Holdings', value: SAMPLE_HOLDINGS.length, detail: 'sample instruments' }]} /><PortfolioScreen view={view} openRecord={openRecord} /></>;
  if (page.id === 'financeTrends' && view === 'recurring') return <SubscriptionRecords view="active" added={subscriptionEntries} openRecord={openRecord} />;
  return <TransactionRecords page={page} view={view} added={added} openRecord={openRecord} />;
}
