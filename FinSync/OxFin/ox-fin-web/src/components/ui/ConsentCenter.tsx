'use client';

import { useState, useEffect } from 'react';
import { Shield, Mail, MessageSquare, Smartphone, CheckCircle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
        onClick={onChange}
        title="Toggle Setting"
        aria-label="Toggle Setting"
        className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 border border-white/10",
            enabled ? "bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-black/50"
        )}
    >
        <span
            className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow-sm",
                enabled ? "translate-x-6" : "translate-x-1 opacity-50"
            )}
        />
    </button>
);

export default function ConsentCenter() {
    // Initialize with false, then hydrate on mount to avoid hydration mismatch
    const [isMounted, setIsMounted] = useState(false);
    const [permissions, setPermissions] = useState({
        sms: false,
        email: false,
        whatsapp: false,
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const togglePermission = (key: 'sms' | 'email' | 'whatsapp') => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const permissionItems = [
        {
            key: 'sms' as const,
            icon: Smartphone,
            title: 'SMS Reading',
            description: 'Parse transaction alerts and bill notifications from your SMS inbox',
            benefits: ['Auto-sync bills', 'Transaction alerts', 'OTP verification'],
            dataUsage: 'We only read messages from banks and utility providers. No personal messages are accessed.',
        },
        {
            key: 'email' as const,
            icon: Mail,
            title: 'Email Access',
            description: 'Read e-statements and bills from financial institutions',
            benefits: ['E-statement parsing', 'Bill reminders', 'Investment updates'],
            dataUsage: 'We scan emails from known financial senders only. Your personal emails remain private.',
        },
        {
            key: 'whatsapp' as const,
            icon: MessageSquare,
            title: 'WhatsApp Alerts',
            description: 'Receive bill notifications and payment confirmations via WhatsApp',
            benefits: ['Real-time alerts', 'Payment confirmations', 'Bill due reminders'],
            dataUsage: 'We send notifications only. We do not read your WhatsApp messages.',
        },
    ];

    const enabledCount = Object.values(permissions).filter(Boolean).length;

    if (!isMounted) return <div className="h-64 card-swiss animate-pulse" />;

    return (
        <div className="space-y-6" suppressHydrationWarning>
            {/* Header */}
            <div className="card-swiss p-8 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden">
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="flex items-start gap-6 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <Shield size={28} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Consent & Privacy Center</h3>
                        <p className="text-sm text-white/60 mb-5 leading-relaxed max-w-3xl">
                            Control how OxFin accesses your data to provide automated bill tracking and financial insights.
                            All data is encrypted and never shared with third parties.
                        </p>
                        <div className="flex items-center gap-2 text-sm bg-black/20 w-fit px-4 py-2 rounded-lg border border-white/5">
                            {enabledCount > 0 ? (
                                <CheckCircle size={16} className="text-emerald-400" />
                            ) : (
                                <XCircle size={16} className="text-white/40" />
                            )}
                            <span className="font-bold text-white/80 tracking-wide">
                                {enabledCount} of {permissionItems.length} permissions enabled
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permission Cards */}
            <div className="space-y-4">
                {permissionItems.map((item) => {
                    const Icon = item.icon;
                    const isEnabled = permissions[item.key];

                    return (
                        <div key={item.key} className="card-swiss p-6 space-y-4 transition-all duration-300 hover:border-white/15">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-5 flex-1">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner transition-all duration-300",
                                        isEnabled ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5"
                                    )}>
                                        <Icon size={24} className={isEnabled ? "text-white" : "text-white/40"} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-white tracking-wide mb-1.5">{item.title}</h4>
                                        <p className="text-sm text-white/60 mb-4 leading-relaxed">{item.description}</p>

                                        {/* Benefits */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {item.benefits.map((benefit, idx) => (
                                                <span key={idx} className="text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70">
                                                    {benefit}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Data Usage Info */}
                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-black/40 border border-white/5">
                                            <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-xs text-white/50 leading-relaxed font-medium">{item.dataUsage}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="pl-4">
                                    <ToggleSwitch
                                        enabled={isEnabled}
                                        onChange={() => togglePermission(item.key)}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Privacy Policy Link */}
            <div className="card-swiss p-5 bg-white/5 flex items-center justify-center">
                <p className="text-xs text-white/50 text-center font-medium">
                    By enabling these permissions, you agree to our{' '}
                    <a href="#" className="text-white hover:text-blue-400 font-bold underline underline-offset-4 decoration-white/30 hover:decoration-blue-400 transition-colors">Privacy Policy</a>
                    {' '}and{' '}
                    <a href="#" className="text-white hover:text-blue-400 font-bold underline underline-offset-4 decoration-white/30 hover:decoration-blue-400 transition-colors">Terms of Service</a>.
                    You can revoke access anytime.
                </p>
            </div>
        </div>
    );
}
