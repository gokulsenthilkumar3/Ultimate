import React from 'react';
import { ShieldCheck, Lock, Wifi } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PhysicalCardProps {
  balance: number;
  cardHolder: string;
  expiry?: string;
  variant?: 'primary' | 'dark' | 'gold';
  isLocked?: boolean;
  cardNumber?: string;
}

export const PhysicalCard: React.FC<PhysicalCardProps> = ({
  balance,
  cardHolder,
  expiry = '10/29',
  variant = 'primary',
  isLocked = false,
  cardNumber = '•••• •••• •••• 8842',
}) => {
  const { formatMoney } = useApp();

  const variantStyles = {
    primary: 'from-blue-600 via-indigo-700 to-slate-900 border-blue-400/30 shadow-blue-500/20',
    dark: 'from-zinc-800 via-zinc-900 to-black border-white/15 shadow-black/40',
    gold: 'from-amber-600 via-yellow-700 to-amber-950 border-amber-400/40 shadow-amber-500/20',
  };

  return (
    <div
      className={`relative w-full aspect-[1.586/1] max-w-[420px] rounded-2xl p-6 bg-gradient-to-br ${variantStyles[variant]} border shadow-2xl flex flex-col justify-between overflow-hidden select-none transition-all duration-300 hover:scale-[1.01]`}
    >
      {/* Background ambient pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

      {/* Top row: Brand & Status */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center font-black text-white text-sm tracking-wider border border-white/20">
            FS
          </div>
          <div>
            <span className="text-xs font-bold tracking-widest text-white/90 block leading-tight">
              FINSYNC ONE
            </span>
            <span className="text-[10px] text-white/50 tracking-wider">PLATINUM</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Wifi className="w-5 h-5 text-white/60 rotate-90" />
          {isLocked ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Locked
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" /> Active
            </span>
          )}
        </div>
      </div>

      {/* Chip & Masked Number */}
      <div className="my-auto z-10">
        <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-600 mb-3 shadow-inner flex items-center justify-center opacity-90 border border-amber-400/40">
          <div className="w-full h-[1px] bg-amber-700/40" />
        </div>
        <p className="text-xl font-mono tracking-[0.25em] text-white/95 drop-shadow-sm font-semibold">
          {cardNumber}
        </p>
      </div>

      {/* Bottom Row: Holder, Expiry & Balance */}
      <div className="flex items-end justify-between z-10">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-white/40 block mb-0.5">
            Cardholder
          </span>
          <p className="text-xs font-semibold tracking-wider text-white uppercase truncate max-w-[170px]">
            {cardHolder}
          </p>
        </div>

        <div>
          <span className="text-[9px] uppercase tracking-widest text-white/40 block mb-0.5">
            Expires
          </span>
          <p className="text-xs font-semibold font-mono tracking-wider text-white">
            {expiry}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[9px] uppercase tracking-widest text-white/40 block mb-0.5">
            Balance
          </span>
          <p className="text-sm font-bold text-white tracking-tight">
            {formatMoney(balance)}
          </p>
        </div>
      </div>
    </div>
  );
};
export default PhysicalCard;
