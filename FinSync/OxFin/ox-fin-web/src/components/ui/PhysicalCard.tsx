'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type PhysicalCardProps = {
    balance: number;
    currency?: string;
    cardNumber?: string;
    cardHolder?: string;
    expiry?: string;
    variant?: 'primary' | 'dark' | 'glass';
    className?: string;
};

export default function PhysicalCard({
    balance,
    currency = '$',
    cardNumber = '•••• •••• •••• 1234',
    cardHolder = 'John Doe',
    expiry = '12/28',
    variant = 'glass', // Defaulting to glass for the new aesthetic
    className
}: PhysicalCardProps) {
    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
                "w-full aspect-[1.586] p-8 flex flex-col justify-between select-none shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(255,255,255,0.05)] transition-all duration-500 relative overflow-hidden rounded-3xl",
                variant === 'primary' && "bg-gradient-to-br from-blue-600/80 to-indigo-700/80 backdrop-blur-xl border border-white/20 text-white",
                variant === 'dark' && "bg-black/60 backdrop-blur-xl border border-white/10 text-white",
                variant === 'glass' && "bg-white/5 backdrop-blur-3xl border border-white/20 text-white",
                className
            )}
        >
            {/* Subtle Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay noise-texture" />
            
            {/* Glossy Highlights */}
            <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-45 pointer-events-none" />
            
            {/* Magnetic Strip / Chip Mockup */}
            <div className="flex justify-between items-start relative z-10">
                <div className="w-12 h-8 rounded bg-yellow-500/30 border border-yellow-400/50 relative overflow-hidden backdrop-blur-md shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/40" />
                </div>
                <div className="text-2xl font-bold tracking-widest italic opacity-90 drop-shadow-md">Ox</div>
            </div>

            {/* Content */}
            <div className="space-y-6 relative z-10">
                <div>
                    <p className="text-[10px] font-bold opacity-60 mb-1 uppercase tracking-[0.2em]">Current Balance</p>
                    <h3 className="text-4xl font-extrabold tracking-tight drop-shadow-md">
                        {currency}{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                </div>

                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <p className="text-[9px] uppercase opacity-60 tracking-[0.2em] font-bold">Card Holder</p>
                        <p className="font-semibold tracking-widest text-sm uppercase drop-shadow-md">{cardHolder}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[9px] uppercase opacity-60 tracking-[0.2em] font-bold">Expires</p>
                        <p className="font-semibold tracking-widest text-sm drop-shadow-md">{expiry}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
