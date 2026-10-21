import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, QrCode } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MFASetupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { updateProfile } = useApp();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const secretKey = 'FINSYNC-7J8K-9L2M-4P5Q';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      setVerified(true);
      updateProfile({ twoFactorEnabled: true });
      setTimeout(() => {
        onClose();
        setVerified(false);
        setCode('');
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md card-swiss p-6 bg-[#0a0a10]/95 border border-white/15 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Two-Factor Authentication</h3>
              <p className="text-[11px] text-white/40">Secure your financial accounts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {verified ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Check size={24} />
            </div>
            <h4 className="text-base font-bold text-white">2FA Successfully Enabled</h4>
            <p className="text-xs text-white/50">Your account is now secured with authenticator codes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-white/60 leading-relaxed">
              Scan the QR code below using Google Authenticator, Authy, or 1Password.
            </p>

            {/* QR code simulation */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="w-32 h-32 bg-white rounded-xl p-2.5 flex items-center justify-center shadow-lg">
                <QrCode className="w-full h-full text-slate-900" />
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono font-bold text-white/80 bg-black/40 px-2.5 py-1 rounded-md border border-white/10">
                  {secretKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                  title="Copy Secret"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full glass-input px-3 py-2.5 rounded-xl text-center text-lg font-mono font-bold tracking-[0.3em]"
                required
              />
              <button
                type="submit"
                disabled={code.length !== 6}
                className="w-full glass-button py-3 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm & Activate 2FA
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
export default MFASetupModal;
