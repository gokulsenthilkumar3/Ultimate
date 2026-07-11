import React, { useState, useRef } from 'react';
import {
  User, Camera, Save, Trash2, Edit3, ChevronDown, ChevronUp,
  Mail, Phone, MapPin, Ruler, Weight, Calendar, Flag, Globe,
  Shield, Bell, Moon, Sun, Eye, EyeOff, Check, X, Upload
} from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';

export default function ProfileEditor() {
  const user = useStore(s => s.user);
  const updateUser = useStore(s => s.updateUser);
  const fetchInitialData = useStore(s => s.fetchInitialData);
  const toast = useToast();

  const [editMode, setEditMode] = useState(false);
  const [expandedSection, setExpandedSection] = useState('personal');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    location_name: user?.location_name || '',
    nationality: user?.nationality || '',
    language: user?.language || 'English',
    height: user?.height || '',
    weight: user?.weight || '',
    dob: user?.dob || '',
    gender: user?.gender || '',
    bloodType: user?.bloodType || '',
    goals: { primary: user?.goals?.primary || '' },
    notifications: user?.notifications ?? true,
    theme: user?.theme || 'dark',
  });

  // ── Avatar upload ───────────────────────────────────────────────────────────
  const handleAvatarClick = () => {
    if (!editMode) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate: image only, max 5 MB
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    // Optimistic preview via FileReader
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    try {
      // Build multipart form data for the API
      const body = new FormData();
      body.append('avatar', file);
      const result = await apiSync('/profile/avatar', 'POST', body, { raw: true });
      const url = result?.url || result?.avatar || null;
      if (url) {
        setAvatarPreview(url);
        await updateUser({ avatar: url });
        toast.success('Profile photo updated');
      } else {
        // Backend may not support avatar endpoint yet — keep local data-URL preview
        await updateUser({ avatar: reader.result });
        toast.success('Profile photo updated (local preview — sync your backend)');
      }
    } catch {
      // Graceful degradation: persist as base64 in store / Supabase profile column
      try {
        await updateUser({ avatar: avatarPreview });
        toast.success('Profile photo saved');
      } catch {
        toast.error('Failed to upload photo');
        setAvatarPreview(user?.avatar || null);
      }
    } finally {
      setAvatarUploading(false);
      // Reset input so same file can be reselected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    setAvatarPreview(null);
    await updateUser({ avatar: null });
    toast.success('Profile photo removed');
  };
  // ────────────────────────────────────────────────────────────────────────────

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    try {
      await updateUser({ ...formData, avatar: avatarPreview });
      toast.success('Profile saved successfully');
      setEditMode(false);
      fetchInitialData();
    } catch {
      toast.error('Failed to save profile');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
      location_name: user?.location_name || '',
      nationality: user?.nationality || '',
      language: user?.language || 'English',
      height: user?.height || '',
      weight: user?.weight || '',
      dob: user?.dob || '',
      gender: user?.gender || '',
      bloodType: user?.bloodType || '',
      goals: { primary: user?.goals?.primary || '' },
      notifications: user?.notifications ?? true,
      theme: user?.theme || 'dark',
    });
    setAvatarPreview(user?.avatar || null);
    setEditMode(false);
  };

  const toggleSection = (section) =>
    setExpandedSection(prev => (prev === section ? null : section));

  const Section = ({ id, title, icon: Icon, children }) => (
    <div className="glass-card" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
      <button
        onClick={() => toggleSection(id)}
        style={{
          width: '100%', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon size={18} color="var(--accent)" />
          <span style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        </div>
        {expandedSection === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expandedSection === id && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>{children}</div>
      )}
    </div>
  );

  const Field = ({ label, type = 'text', field, placeholder, options }) => (
    <div style={{ marginBottom: '1rem' }}>
      <label className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '6px', color: 'var(--text-3)' }}>{label}</label>
      {options ? (
        <select
          className="form-input"
          value={field.includes('.') ? formData[field.split('.')[0]]?.[field.split('.')[1]] : formData[field]}
          onChange={e => handleChange(field, e.target.value)}
          disabled={!editMode}
          style={{ width: '100%', opacity: editMode ? 1 : 0.7 }}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type === 'password' && !showPassword ? 'password' : type === 'password' ? 'text' : type}
          className="form-input"
          value={field.includes('.') ? formData[field.split('.')[0]]?.[field.split('.')[1]] || '' : formData[field] || ''}
          onChange={e => handleChange(field, e.target.value)}
          placeholder={placeholder}
          disabled={!editMode}
          style={{ width: '100%', opacity: editMode ? 1 : 0.7 }}
        />
      )}
    </div>
  );

  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Identity & Profile</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Profile Editor</h2>
          <p className="text-secondary">Manage your personal data, appearance, and preferences.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {editMode ? (
            <>
              <button onClick={handleCancel} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <X size={16} /> CANCEL
              </button>
              <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={16} /> SAVE CHANGES
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={16} /> EDIT PROFILE
            </button>
          )}
        </div>
      </div>

      {/* Avatar Section */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
            aria-label="Upload profile photo"
          />

          {/* Avatar circle */}
          <div
            onClick={handleAvatarClick}
            style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: avatarPreview ? 'transparent' : 'var(--accent-gradient)',
              border: '3px solid var(--accent)', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: editMode ? 'pointer' : 'default',
              position: 'relative',
              transition: 'opacity 0.2s',
            }}
            title={editMode ? 'Click to upload a new photo' : undefined}
          >
            {avatarUploading ? (
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : avatarPreview ? (
              <img src={avatarPreview} alt={user?.name || 'Profile'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={40} color="white" />
            )}

            {/* Edit overlay shown on hover when editMode */}
            {editMode && !avatarUploading && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s', borderRadius: '50%',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
              >
                <Camera size={20} color="white" />
                <span style={{ fontSize: '0.6rem', color: 'white', fontWeight: 700, marginTop: '4px' }}>CHANGE</span>
              </div>
            )}
          </div>

          {editMode && avatarPreview && (
            <button
              onClick={removeAvatar}
              title="Remove photo"
              style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: '#f43f5e', border: 'none', borderRadius: '50%',
                width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', color: 'white',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: 900, fontSize: '1.5rem', marginBottom: '0.25rem' }}>{user?.name || 'Unnamed Operator'}</h3>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{user?.email || 'No email set'}</p>
          {editMode && (
            <button
              onClick={handleAvatarClick}
              className="btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}
              disabled={avatarUploading}
            >
              <Upload size={14} /> {avatarUploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <Section id="personal" title="Personal Information" icon={User}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
          <Field label="Full Name" field="name" placeholder="Your name" />
          <Field label="Email" type="email" field="email" placeholder="your@email.com" />
          <Field label="Phone" type="tel" field="phone" placeholder="+91 00000 00000" />
          <Field label="Date of Birth" type="date" field="dob" />
          <Field label="Gender" field="gender" options={['', 'Male', 'Female', 'Non-binary', 'Prefer not to say']} />
          <Field label="Blood Type" field="bloodType" options={['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
        </div>
        <Field label="Bio / About Me" field="bio" placeholder="Short bio..." />
      </Section>

      {/* Location */}
      <Section id="location" title="Location & Language" icon={MapPin}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
          <Field label="City / Region" field="location_name" placeholder="e.g. Sivanmalai, TN" />
          <Field label="Nationality" field="nationality" placeholder="e.g. Indian" />
          <Field label="Language" field="language" options={['English', 'Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam', 'French', 'Spanish', 'German', 'Japanese']} />
        </div>
      </Section>

      {/* Physical Stats */}
      <Section id="physical" title="Physical Stats" icon={Shield}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
          <Field label="Height (cm)" type="number" field="height" placeholder="175" />
          <Field label="Weight (kg)" type="number" field="weight" placeholder="70" />
        </div>
      </Section>

      {/* Goals */}
      <Section id="goals" title="Primary Goal" icon={Flag}>
        <Field label="Primary Goal" field="goals.primary" options={['', 'Lose Fat', 'Build Muscle', 'Recomposition', 'Improve Endurance', 'Improve Flexibility', 'General Wellness']} />
      </Section>

      {/* Preferences */}
      <Section id="prefs" title="Preferences" icon={Bell}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={16} color="var(--text-3)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Notifications</span>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '22px', cursor: editMode ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={formData.notifications} onChange={e => editMode && handleChange('notifications', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{
              position: 'absolute', cursor: editMode ? 'pointer' : 'default', top: 0, left: 0, right: 0, bottom: 0,
              background: formData.notifications ? 'var(--accent)' : 'var(--bg-dark)',
              borderRadius: '22px', transition: '0.3s',
            }}>
              <span style={{
                position: 'absolute', content: '', height: '16px', width: '16px', left: formData.notifications ? '22px' : '4px', bottom: '3px',
                background: 'white', borderRadius: '50%', transition: '0.3s',
              }} />
            </span>
          </label>
        </div>
      </Section>
    </div>
  );
}
