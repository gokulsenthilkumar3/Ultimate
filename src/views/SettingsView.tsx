import React, { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  Globe,
  Lock,
  Smartphone,
  CheckCircle2,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useApp, REGIONAL_OPTIONS } from '../context/AppContext';
import { MFASetupModal } from '../components/modals/MFASetupModal';

export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfile,
    preferences,
    updatePreferences,
  } = useApp();

  const [tab, setTab] = useState<'profile' | 'security' | 'regional' | 'notifications'>('profile');
  const [nameInput, setNameInput] = useState(profile.name);
  const [emailInput, setEmailInput] = useState(profile.email);
  const [phoneInput, setPhoneInput] = useState(profile.phone);
  const [isMFAModalOpen, setIsMFAModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: nameInput,
      email: emailInput,
      phone: phoneInput,
      initials: nameInput
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'GS',
    });
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Account & System Settings</h2>
        <p className="text-xs text-white/50">
          Manage credentials, security protocols, and international currency preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Settings Navigation Rail */}
        <div className="card-swiss p-2 space-y-1">
          {[
            { id: 'profile', label: 'Profile & Account', icon: User },
            { id: 'security', label: 'Security & 2FA', icon: Shield },
            { id: 'regional', label: 'Regional & Currency', icon: Globe },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-blue-400' : 'text-white/40'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3">
          {tab === 'profile' && (
            <div className="card-swiss p-6 space-y-5">
              <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-xl shadow-blue-500/20 border border-white/15">
                  {profile.initials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{profile.name}</h3>
                  <p className="text-xs text-white/50">{profile.email}</p>
                  <span className="badge badge-emerald mt-1.5">{profile.plan}</span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    className="glass-button px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2"
                  >
                    <Save size={14} /> Save Profile
                  </button>

                  {saveMessage && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 size={15} /> Saved successfully!
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {tab === 'security' && (
            <div className="card-swiss p-6 space-y-5">
              <h3 className="text-sm font-bold text-white">Security & Access Safeguards</h3>

              {/* 2FA Toggle Row */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      profile.twoFactorEnabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-white/50'
                    }`}
                  >
                    <Lock size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</p>
                    <p className="text-[10px] text-white/40">
                      Require authenticator app verification code on critical actions
                    </p>
                  </div>
                </div>

                {profile.twoFactorEnabled ? (
                  <span className="badge badge-emerald">Enabled</span>
                ) : (
                  <button
                    onClick={() => setIsMFAModalOpen(true)}
                    className="glass-button px-3.5 py-1.5 rounded-lg text-xs font-bold"
                  >
                    Setup 2FA
                  </button>
                )}
              </div>

              {/* Biometrics */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Biometric Device Sign-in</p>
                    <p className="text-[10px] text-white/40">
                      Use Face ID, Touch ID, or Windows Hello for instant entry
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={profile.biometricsEnabled}
                  onChange={(e) => updateProfile({ biometricsEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-500 bg-white/10 border-white/20"
                />
              </div>
            </div>
          )}

          {tab === 'regional' && (
            <div className="card-swiss p-6 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white">Regional Currency & Locale</h3>
                <p className="text-xs text-white/40">
                  Select your currency format. All balances and ledger figures adapt immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {REGIONAL_OPTIONS.map((opt) => {
                  const isSelected = preferences.currency === opt.currency;
                  return (
                    <button
                      key={opt.currency}
                      onClick={() => updatePreferences(opt)}
                      className={`p-4 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/50 shadow-md'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl font-bold font-mono text-white">
                          {opt.symbol} {opt.currency}
                        </span>
                        {isSelected && <CheckCircle2 size={16} className="text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-white/50">Locale: {opt.locale}</p>
                      <p className="text-[10px] text-white/30">Zone: {opt.timeZone}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="card-swiss p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Notification Channels</h3>

              <div className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                <div>
                  <p className="text-xs font-semibold text-white">Email Daily Digest & Alerts</p>
                  <p className="text-[10px] text-white/40">Summaries of cashflow and large debits</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.emailNotifs}
                  onChange={(e) => updateProfile({ emailNotifs: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-500 bg-white/10 border-white/20"
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-semibold text-white">Push & In-App Alerts</p>
                  <p className="text-[10px] text-white/40">Real-time alerts on bill dues and transfers</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.pushNotifs}
                  onChange={(e) => updateProfile({ pushNotifs: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-500 bg-white/10 border-white/20"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <MFASetupModal
        isOpen={isMFAModalOpen}
        onClose={() => setIsMFAModalOpen(false)}
      />
    </div>
  );
};
export default SettingsView;
