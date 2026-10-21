import React, { useState } from 'react';
import { X, ArrowRight, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TransferModal: React.FC = () => {
  const {
    isTransferModalOpen,
    setIsTransferModalOpen,
    wallets,
    transferFunds,
    formatMoney,
  } = useApp();

  const [fromWalletId, setFromWalletId] = useState<string>(wallets[0]?.id || '');
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isTransferModalOpen) return null;

  const currentWallet = wallets.find((w) => w.id === fromWalletId) || wallets[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setErrorMessage('Please enter a valid transfer amount.');
      setStatus('error');
      return;
    }

    if (!recipient.trim()) {
      setErrorMessage('Please specify a recipient or wallet target.');
      setStatus('error');
      return;
    }

    if (currentWallet && currentWallet.balance < val) {
      setErrorMessage(`Insufficient balance in ${currentWallet.name}.`);
      setStatus('error');
      return;
    }

    if (currentWallet?.isLocked) {
      setErrorMessage(`${currentWallet.name} is currently locked.`);
      setStatus('error');
      return;
    }

    const success = transferFunds(fromWalletId, recipient.trim(), val, note.trim());
    if (success) {
      setStatus('success');
      setTimeout(() => {
        setIsTransferModalOpen(false);
        setStatus('idle');
        setAmount('');
        setRecipient('');
        setNote('');
      }, 1400);
    } else {
      setErrorMessage('Transfer could not be completed.');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md card-swiss p-6 bg-[#0a0a10]/95 border border-white/15 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Wallet size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Transfer Funds</h3>
              <p className="text-[11px] text-white/40">Instant wallet or peer-to-peer transfer</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsTransferModalOpen(false);
              setStatus('idle');
            }}
            className="p-1 rounded-lg text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
            <h4 className="text-lg font-bold text-white">Transfer Sent!</h4>
            <p className="text-xs text-white/50">
              Successfully transferred {formatMoney(parseFloat(amount))} to {recipient}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* From Wallet */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                From Account / Wallet
              </label>
              <select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-[#121218]"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — Balance: {formatMoney(w.balance)} {w.isLocked ? '(LOCKED)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                To Recipient / UPI / IBAN / Wallet
              </label>
              <input
                type="text"
                placeholder="e.g. gokul@upi, Alex M., or Wallet Lite"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
              />
              {/* Quick suggestion tabs */}
              <div className="flex gap-2 pt-1">
                {wallets
                  .filter((w) => w.id !== fromWalletId)
                  .map((w) => (
                    <button
                      type="button"
                      key={w.id}
                      onClick={() => setRecipient(w.id)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
                    >
                      Swap to {w.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-white/40">
                <span>Amount</span>
                {currentWallet && (
                  <span>Available: {formatMoney(currentWallet.balance)}</span>
                )}
              </div>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-base font-mono font-bold"
              />
            </div>

            {/* Note */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                Note / Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Monthly rent, groceries, dinner"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full glass-button py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-2"
            >
              <span>Confirm & Send</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
export default TransferModal;
