import React, { useState } from 'react';
import { AlertTriangle, Building2, ChevronDown, CreditCard, FileSpreadsheet, Info, Landmark, ShieldCheck, Smartphone, Upload } from 'lucide-react';

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
  const [expanded, setExpanded] = useState<string>('HDFC Bank');
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
              <p className="finance-sync-warning"><AlertTriangle size={15}/> Direct authorization is unavailable for this provider. Use the provider’s official export, then review it locally before importing.</p>
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
      <label className="btn-primary" aria-disabled={csvUploading}>
        {csvUploading ? 'Processing…' : <><Upload size={16}/> Choose CSV</>}
        <input type="file" aria-label="Upload CSV statement" accept=".csv,text/csv" onChange={handleCsvImport} disabled={csvUploading} style={{ display: 'none' }}/>
      </label>
    </section>
    
    <p className="finance-sync-warning">
      <AlertTriangle size={15}/> GrowthTrack does not request bank passwords, card PINs, OTPs, or unofficial scraping access. A direct connector will appear only after a verified adapter, consent screen, encrypted token storage, revocation, and real sync tests are configured.
    </p>
  </div>;
}
