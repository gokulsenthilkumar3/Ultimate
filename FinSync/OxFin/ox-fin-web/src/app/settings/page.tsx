'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { User, Lock, Bell, CreditCard, Shield, Mail, Globe, Check, Languages, LogOut, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConsentCenter from '@/components/ui/ConsentCenter';
import MFASetupModal from '@/components/ui/MFASetupModal';
import { regionalDefaults, regionalOptions, type RegionalPreferences } from '@/lib/regional';

/* ── Toggle ──────────────────────────────────────────────────────── */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
    return (
        <button onClick={onChange} aria-label="Toggle setting" className="shrink-0">
            <div className={cn('toggle-track', enabled ? 'on' : 'off')}>
                <span className={cn('toggle-thumb', enabled ? 'on' : 'off')} />
            </div>
        </button>
    );
}

/* ── Toggle Row ──────────────────────────────────────────────────── */
function ToggleRow({ icon: Icon, label, sub, enabled, onChange, iconClass = 'text-white/50' }: {
    icon: any; label: string; sub: string; enabled: boolean; onChange: () => void; iconClass?: string;
}) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-white/[0.05] last:border-0">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center ${iconClass}`}>
                    <Icon size={16} />
                </div>
                <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-white/35 mt-0.5">{sub}</p>
                </div>
            </div>
            <Toggle enabled={enabled} onChange={onChange} />
        </div>
    );
}

const TABS = [
    { id: 'profile',       label: 'Profile',       icon: User },
    { id: 'security',      label: 'Security',      icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'regional',      label: 'Regional',      icon: Globe },
    { id: 'accounts',      label: 'Accounts',      icon: CreditCard },
];

export default function SettingsPage() {
    const { data: session } = useSession();
    const [tab, setTab] = useState('profile');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [isMFAModalOpen, setIsMFAModalOpen] = useState(false);
    const [biometricsEnabled, setBiometricsEnabled] = useState(true);
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [pushNotifs, setPushNotifs] = useState(true);
    const [marketingNotifs, setMarketingNotifs] = useState(false);
    const [regional, setRegional] = useState<RegionalPreferences>(regionalDefaults);
    const [savedRegional, setSavedRegional] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('oxfin-regional-preferences');
            if (saved) setRegional({ ...regionalDefaults, ...JSON.parse(saved) });
        } catch { }
    }, []);

    const saveRegional = (locale: string) => {
        const option = regionalOptions.find(i => i.locale === locale) || regionalOptions[0];
        const next = { locale: option.locale, currency: option.currency, timeZone: option.timeZone };
        setRegional(next);
        localStorage.setItem('oxfin-regional-preferences', JSON.stringify(next));
        setSavedRegional(true);
        setTimeout(() => setSavedRegional(false), 2200);
    };

    useEffect(() => {
        if (!session) return;
        fetch('/api/user/security-status')
            .then(r => r.json())
            .then(d => setTwoFactorEnabled(d.twoFactorEnabled))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [session]);

    const initials = session?.user?.name
        ? session.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'OX';

    return (
        <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8 pb-24 relative z-10" suppressHydrationWarning>
            {/* Ambient */}
            <div className="fixed top-[5%] right-[5%] w-[40%] h-[40%] bg-purple-600/6 rounded-full blur-[140px] animate-orb pointer-events-none -z-10" />

            {/* ── Header ── */}
            <header className="animate-slide-up">
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Settings</h1>
                <p className="text-sm text-white/40 mt-1">Manage your account preferences and security</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* ── Tab Rail ── */}
                <div className="lg:col-span-1">
                    <div className="section-card p-2 space-y-0.5 animate-slide-up-delay-1">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all text-left',
                                    tab === t.id
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                                )}>
                                <t.icon size={16} className={tab === t.id ? 'text-blue-400' : 'text-white/30'} />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="lg:col-span-3 space-y-5 animate-slide-up-delay-2">

                    {/* Profile */}
                    {tab === 'profile' && (
                        <div className="card-swiss p-6 space-y-6">
                            <h2 className="text-base font-bold text-white">Profile & Account</h2>

                            {/* Avatar */}
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black ring-2 ring-white/10 shadow-xl shadow-blue-500/20">
                                    {initials}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{session?.user?.name || 'Account holder'}</p>
                                    <p className="text-xs text-white/40 mt-0.5">{session?.user?.email}</p>
                                    <button className="text-xs text-blue-400 hover:text-blue-300 mt-1.5 font-medium transition-colors">Change photo</button>
                                </div>
                            </div>

                            {[
                                { label: 'Full Name', type: 'text', defaultValue: session?.user?.name || '', placeholder: 'Your full name' },
                                { label: 'Email Address', type: 'email', defaultValue: session?.user?.email || '', placeholder: 'name@example.com' },
                                { label: 'Phone Number', type: 'tel', defaultValue: '+1 (555) 123-4567', placeholder: '+1 (000) 000-0000' },
                            ].map(f => (
                                <div key={f.label}>
                                    <label className="text-[10px] font-bold text-white/30 mb-2 block uppercase tracking-[0.15em]">{f.label}</label>
                                    <input type={f.type} defaultValue={f.defaultValue} placeholder={f.placeholder}
                                        className="glass-input w-full px-4 py-3 rounded-xl text-sm" />
                                </div>
                            ))}

                            <button className="glass-button w-full py-3.5 rounded-xl font-bold text-sm">
                                Save Changes
                            </button>
                        </div>
                    )}

                    {/* Security */}
                    {tab === 'security' && (
                        <div className="card-swiss p-6 space-y-1">
                            <h2 className="text-base font-bold text-white mb-4">Security Settings</h2>

                            <ToggleRow
                                icon={Lock} label="Two-Factor Authentication"
                                sub="Add an extra layer of security to your account"
                                enabled={twoFactorEnabled}
                                onChange={() => !twoFactorEnabled && setIsMFAModalOpen(true)}
                                iconClass={twoFactorEnabled ? 'text-emerald-400 bg-emerald-500/12 border-emerald-500/20' : 'text-white/40'}
                            />
                            <ToggleRow
                                icon={Shield} label="Biometric Login"
                                sub="Use Face ID or Touch ID to sign in"
                                enabled={biometricsEnabled}
                                onChange={() => setBiometricsEnabled(!biometricsEnabled)}
                            />

                            <div className="pt-5">
                                <button className="glass-button-secondary w-full py-3 rounded-xl text-sm font-semibold">
                                    Change Password
                                </button>
                            </div>

                            {twoFactorEnabled && (
                                <div className="mt-2 flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                                    <Shield size={16} className="text-emerald-400 shrink-0" />
                                    <p className="text-xs text-emerald-300 font-medium">Your account is protected with two-factor authentication.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notifications */}
                    {tab === 'notifications' && (
                        <div className="card-swiss p-6">
                            <h2 className="text-base font-bold text-white mb-4">Notification Preferences</h2>
                            <ToggleRow icon={Mail} label="Email Notifications" sub="Transaction alerts and account updates" enabled={emailNotifs} onChange={() => setEmailNotifs(!emailNotifs)} />
                            <ToggleRow icon={Bell} label="Push Notifications" sub="Real-time mobile alerts" enabled={pushNotifs} onChange={() => setPushNotifs(!pushNotifs)} />
                            <ToggleRow icon={Globe} label="Marketing & Offers" sub="Product updates, promotions, and offers" enabled={marketingNotifs} onChange={() => setMarketingNotifs(!marketingNotifs)} />
                        </div>
                    )}

                    {/* Regional */}
                    {tab === 'regional' && (
                        <div className="card-swiss p-6 space-y-5">
                            <h2 className="text-base font-bold text-white">Language & Region</h2>
                            <div>
                                <label htmlFor="regional-pref" className="text-[10px] font-bold text-white/30 mb-2 block uppercase tracking-[0.15em]">Display Region</label>
                                <select id="regional-pref" value={regional.locale} onChange={e => saveRegional(e.target.value)}
                                    className="glass-input w-full px-4 py-3 rounded-xl text-sm">
                                    {regionalOptions.map(o => <option key={o.locale} value={o.locale} className="bg-slate-900">{o.label}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Currency</p>
                                    <p className="text-sm font-bold text-white">{regional.currency}</p>
                                </div>
                                <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4">
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Time Zone</p>
                                    <p className="text-sm font-bold text-white truncate">{regional.timeZone}</p>
                                </div>
                            </div>
                            <p className="text-xs text-white/30 leading-relaxed">
                                Preferences saved on this device. OxFin uses local conventions for amounts and dates without changing the underlying account currency.
                            </p>
                            {savedRegional && (
                                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium animate-fade-in">
                                    <Check size={15} /> Regional preferences saved
                                </div>
                            )}
                        </div>
                    )}

                    {/* Linked Accounts */}
                    {tab === 'accounts' && (
                        <div className="card-swiss p-6 space-y-4">
                            <h2 className="text-base font-bold text-white mb-2">Linked Bank Accounts</h2>
                            {[
                                { name: 'Chase Bank', account: '••••1234' },
                                { name: 'Wells Fargo', account: '••••5678' },
                            ].map((bank) => (
                                <div key={bank.name} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center">
                                            <CreditCard size={18} className="text-white/60" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{bank.name}</p>
                                            <p className="text-[11px] text-white/35 tracking-wider mt-0.5">{bank.account}</p>
                                        </div>
                                    </div>
                                    <span className="badge badge-emerald"><Check size={9} /> Connected</span>
                                </div>
                            ))}
                            <button className="w-full py-3.5 rounded-2xl border border-dashed border-white/15 text-white/35 font-semibold text-sm hover:border-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-all">
                                + Link New Account
                            </button>
                        </div>
                    )}

                    {/* Consent Center (always visible on profile tab) */}
                    {tab === 'profile' && (
                        <ConsentCenter />
                    )}

                    {/* Danger Zone (always at bottom of security) */}
                    {tab === 'security' && (
                        <div className="card-swiss p-6 border-red-500/20">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle size={18} className="text-red-400" />
                                <h3 className="text-sm font-bold text-red-400">Danger Zone</h3>
                            </div>
                            <p className="text-xs text-white/35 mb-4 leading-relaxed">
                                These actions are permanent and cannot be undone. Proceed with caution.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button onClick={() => signOut({ callbackUrl: '/' })}
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-semibold hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 transition-all">
                                    <LogOut size={15} /> Sign Out
                                </button>
                                <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/20 text-red-400/70 text-sm font-semibold hover:bg-red-500/8 hover:text-red-400 transition-all">
                                    <AlertTriangle size={15} /> Delete Account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <MFASetupModal
                isOpen={isMFAModalOpen}
                onClose={() => setIsMFAModalOpen(false)}
                onSuccess={() => setTwoFactorEnabled(true)}
            />
        </div>
    );
}
