'use client';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function ProfilePage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [familySize, setFamilySize] = useState('1');
    const [plan, setPlan] = useState('Free Plan');
    const [initials, setInitials] = useState('?');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (!user) return;
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                const data = snap.data();
                
                const displayName = user.displayName || data?.profile?.name || user.email?.split('@')[0] || 'User';
                setName(displayName);
                setEmail(user.email || '');
                setFamilySize((data?.profile?.familySize || 1).toString());
                setPlan(data?.billing?.plan || 'Free Plan');
                
                const userInitials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                setInitials(userInitials);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        setSaving(true);
        setMessage('');

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                'profile.name': name,
                'profile.familySize': Number(familySize)
            });

            // Update initials
            const userInitials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
            setInitials(userInitials);

            setMessage('✓ Profile updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error(err);
            setMessage('✗ Error saving profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading profile data…</div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Account Settings</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage your personal details and subscription plan</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 28 }}>
                {/* Profile Avatar Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
                    <div style={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-pink))', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        fontSize: 28, 
                        fontWeight: 800, 
                        color: 'white',
                        boxShadow: '0 8px 24px rgba(108,99,255,0.3)'
                    }}>
                        {initials}
                    </div>
                    <div>
                        <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>{name}</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{email}</p>
                    </div>
                    <span className="badge badge-purple" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: 10 }}>
                        {plan}
                    </span>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSaveProfile} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
                        <input 
                            type="text" 
                            required 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', fontSize: 14 }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address (Non-editable)</label>
                        <input 
                            type="email" 
                            disabled 
                            value={email} 
                            style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'not-allowed', outline: 'none', fontSize: 14 }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Family Size (For AI budget calculations)</label>
                        <input 
                            type="number" 
                            required 
                            min="1"
                            value={familySize} 
                            onChange={(e) => setFamilySize(e.target.value)}
                            style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', fontSize: 14 }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: 8 }} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Profile Changes'}
                    </button>

                    {message && (
                        <div style={{ 
                            fontSize: 13, 
                            fontWeight: 600, 
                            color: message.startsWith('✓') ? 'var(--accent-green)' : 'var(--error)', 
                            textAlign: 'center', 
                            marginTop: 4 
                        }}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
