import React, { useState } from 'react';
import { AlertTriangle, Building2, ChevronDown, CreditCard, FileSpreadsheet, Info, Landmark, ShieldCheck, Smartphone, Upload, Link } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const PROVIDERS = [
  { name: 'BHIM and UPI apps', icon: Smartphone, availability: 'Statement import', note: 'UPI apps usually do not provide a complete portable CSV. Export the linked bank-account statement and import it here.', steps: ['Open the bank account linked to BHIM, Google Pay, PhonePe or Paytm.', 'Download the statement for the required date range as CSV or Excel.', 'Import it below and review duplicates before applying.'] },
  { name: 'Slice and Uni', icon: CreditCard, availability: 'Statement import', note: 'Use the card or credit-line statement supplied by the app. Direct account authorization is not configured.', steps: ['Open Statements or Billing in the app.', 'Choose the billing period and download the statement.', 'Prefer CSV; convert an official Excel statement to CSV if needed.'] },
  { name: 'HDFC Bank', icon: Landmark, availability: 'Statement import', note: 'HDFC NetBanking documents account statements under Save → Accounts → Statement.', steps: ['Sign in to HDFC NetBanking yourself.', 'Open Save → Accounts, choose the account, then Statement.', 'Select the date range, request/download the statement, and import the CSV here.'] },
  { name: 'SBI / YONO', icon: Building2, availability: 'Statement import', note: 'Use Account Statement or e-statement in SBI Internet Banking/YONO. Screen labels can vary by app version.', steps: ['Sign in to SBI Internet Banking or YONO yourself.', 'Open Accounts or e-Statements and select the account/date range.', 'Download CSV/Excel when offered; otherwise use the official statement and convert it locally.'] },
  { name: 'Axio', icon: Smartphone, availability: 'Setup required', note: 'No working Axio authorization adapter is configured. SMS scraping is not enabled.', steps: ['Export transactions or a statement from Axio if your app version offers it.', 'Import the resulting CSV below.', 'Do not provide GrowthTrack your Axio password or OTP.'] },
  { name: 'Roar Bank and other apps', icon: Building2, availability: 'Verify provider', note: 'The provider could not be verified from the configured connectors. Use its official statement export.', steps: ['Find Statements, Transactions, or Account activity.', 'Download CSV/Excel for the desired period.', 'Import it below and verify column mapping before saving.'] },
];

interface SyncTabProps {
  csvUploading?: boolean;
  handleCsvImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SyncTab({ csvUploading, handleCsvImport }: SyncTabProps) {
  const toast: any = useToast();
  const [expanded, setExpanded] = useState<string>('HDFC Bank');
  const [authorizing, setAuthorizing] = useState<string | false>(false);

  const mockAuthorize = (providerName: string) => {
    setAuthorizing(providerName);
    setTimeout(() => {
      setAuthorizing(false);
      toast.success(`Secure token established for ${providerName}. (Mock)`);
    }, 1500);
  };

  return <div className="finance-sync-container">
    <header className="finance-sync-header">
      <h3 className="text-display finance-sync-title">Bank and app imports</h3>
      <p className="text-secondary finance-sync-subtitle">Bring statements into your private ledger. No bank password, card PIN, or OTP is requested or stored.</p>
    </header>
    
    <div className="finance-sync-trust">
      <ShieldCheck size={20}/>
      <div>
        <strong>Local review before import</strong>
        <span>CSV rows should be previewed, mapped, and checked for duplicates before they change your ledger.</span>
      </div>
    </div>
    
    <section className="finance-sync-guides" aria-label="Provider import guides">
      {PROVIDERS.map(provider => (
        <article key={provider.name} className="finance-sync-guide">
          <button onClick={() => setExpanded(expanded === provider.name ? '' : provider.name)} aria-expanded={expanded === provider.name}>
            <provider.icon size={19}/>
            <span><strong>{provider.name}</strong><small>{provider.availability}</small></span>
            <Info size={16}/>
            <ChevronDown size={16}/>
          </button>
          
          {expanded === provider.name && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '0.25rem' }}>{provider.note}</p>
                <ol>
                  {provider.steps.map(step => <li key={step} style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '2px 0' }}>{step}</li>)}
                </ol>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => mockAuthorize(provider.name)}
                  className="btn-primary" 
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                  disabled={!!authorizing}
                >
                  <Link size={14} style={{ marginRight: '4px' }} />
                  {authorizing === provider.name ? 'Connecting...' : `Authorize ${provider.name}`}
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
    </section>
    
    <section className="finance-sync-import">
      <FileSpreadsheet size={24}/>
      <div>
        <strong>Import a bank statement</strong>
        <p>Accepted now: CSV up to 2 MB. Use an official export and remove passwords or unrelated personal notes before importing.</p>
      </div>
      <label className="btn-primary">
        {csvUploading ? 'Processing…' : <><Upload size={16}/> Choose CSV</>}
        <input type="file" aria-label="Upload CSV statement" accept=".csv,text/csv" onChange={handleCsvImport} disabled={csvUploading} style={{ display: 'none' }}/>
      </label>
    </section>
    
    <p className="finance-sync-warning">
      <AlertTriangle size={15}/> Direct authorization appears only after a verified provider adapter, consent screen, encrypted tokens, revocation, and real sync tests are configured. The authorize buttons above are currently for demonstration.
    </p>
  </div>;
}
