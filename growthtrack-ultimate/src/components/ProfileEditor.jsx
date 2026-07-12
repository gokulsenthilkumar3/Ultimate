import React, { useState, useRef, useEffect } from 'react';
import {
  User, Camera, Save, X, Upload, CheckCircle,
  MapPin, Shield, Flag, Bell, Layout
} from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'location', label: 'Location & Language', icon: MapPin },
  { id: 'physical', label: 'Physical Stats', icon: Shield },
  { id: 'goals', label: 'Primary Goal', icon: Flag },
  { id: 'prefs', label: 'Preferences', icon: Bell },
];

const Field = ({ label, type = 'text', field, placeholder, options, formData, handleChange }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <label className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '8px', color: 'var(--text-3)' }}>{label}</label>
    {options ? (
      <select
        className="form-input"
        value={field.includes('.') ? formData[field.split('.')[0]]?.[field.split('.')[1]] : formData[field]}
        onChange={e => handleChange(field, e.target.value)}
        style={{ width: '100%' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input
        type={type}
        className="form-input"
        value={field.includes('.') ? formData[field.split('.')[0]]?.[field.split('.')[1]] || '' : formData[field] || ''}
        onChange={e => handleChange(field, e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
    )}
  </div>
);

export default function ProfileEditor() {
  const user = useStore(s => s.user);
  const updateUser = useStore(s => s.updateUser);
  const fetchInitialData = useStore(s => s.fetchInitialData);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('personal');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (user && !isLoaded) {
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
        bodyFat: user?.bodyFat || '',
        restingHeartRate: user?.restingHeartRate || '',
        activityLevel: user?.activityLevel || 'Sedentary',
        maintenanceCalories: user?.maintenanceCalories || '',
        trainingStyle: user?.trainingStyle || '',
        chest: user?.chest || '',
        shoulders: user?.shoulders || '',
        waist: user?.waist || '',
        arms: user?.arms || '',
        thighs: user?.thighs || '',
        calves: user?.calves || '',
        neck: user?.neck || '',
        forearm: user?.forearm || '',
        hips: user?.hips || '',
        glutes: user?.glutes || '',
        ankle: user?.ankle || '',
        d_size: user?.d_size || '',
        d_girth: user?.d_girth || '',
        primaryGoal: user?.primaryGoal || '',
        notifications: user?.notifications ?? true,
        theme: user?.theme || 'dark',
      });
      setIsLoaded(true);
    }
  }, [user, isLoaded]);


  // Track changes to show the "Save Changes" button
  useEffect(() => {
    if (!isLoaded) return;
    const isChanged = JSON.stringify(formData) !== JSON.stringify({
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
      bodyFat: user?.bodyFat || '',
      restingHeartRate: user?.restingHeartRate || '',
      activityLevel: user?.activityLevel || 'Sedentary',
      maintenanceCalories: user?.maintenanceCalories || '',
      trainingStyle: user?.trainingStyle || '',
      chest: user?.chest || '',
      shoulders: user?.shoulders || '',
      waist: user?.waist || '',
      arms: user?.arms || '',
      thighs: user?.thighs || '',
      calves: user?.calves || '',
      neck: user?.neck || '',
      forearm: user?.forearm || '',
      hips: user?.hips || '',
      glutes: user?.glutes || '',
      ankle: user?.ankle || '',
      d_size: user?.d_size || '',
      d_girth: user?.d_girth || '',
      primaryGoal: user?.primaryGoal || '',
      notifications: user?.notifications ?? true,
      theme: user?.theme || 'dark',
    }) || avatarPreview !== (user?.avatar || null);
    
    setHasChanges(isChanged);
  }, [formData, avatarPreview, user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    setAvatarUploading(true);
    try {
      const body = new FormData();
      body.append('avatar', file);
      const result = await apiSync('/profile/avatar', 'POST', body, { raw: true });
      const url = result?.url || result?.avatar || null;
      if (url) {
        setAvatarPreview(url);
      }
    } catch {
      // Keep local preview if backend fails
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
  };

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
      await updateUser({
        ...formData,
        avatar: avatarPreview
      });
      toast.success('Profile saved successfully');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save profile');
    }
  };



  return (
    <div className="fade-in module-page" style={{ padding: '1rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Identity & Profile</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Settings</h2>
          <p className="text-secondary">Manage your personal data, appearance, and preferences.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', height: '44px' }}>
          {hasChanges && (
            <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s' }}>
              <Save size={16} /> SAVE CHANGES
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Sidebar Tabs */}
        <div className="glass-card" style={{ flex: '0 0 240px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '12px',
                  background: isActive ? 'var(--bg-elevated)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  color: isActive ? 'var(--accent)' : 'var(--text-3)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Always show Avatar header */}
          <div className="glass-card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              
              <div
                onClick={handleAvatarClick}
                style={{
                  width: '90px', height: '90px', borderRadius: '50%',
                  background: avatarPreview ? 'transparent' : 'var(--accent-gradient)',
                  border: '3px solid var(--accent)', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative'
                }}
                title="Click to upload a new photo"
              >
                {avatarUploading ? (
                  <div className="spinner" style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : avatarPreview ? (
                  <img src={avatarPreview} alt={user?.name || 'Profile'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={36} color="white" />
                )}

                {!avatarUploading && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.2s'
                  }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                    <Camera size={18} color="white" />
                  </div>
                )}
              </div>

              {avatarPreview && (
                <button
                  onClick={removeAvatar}
                  style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--danger)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 900, fontSize: '1.5rem', marginBottom: '0.25rem' }}>{formData.name || 'Unnamed Operator'}</h3>
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{formData.email || 'No email set'}</p>
            </div>
          </div>

          {/* Active Tab Panel */}
          <div className="glass-card" style={{ padding: '2.5rem 2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {React.createElement(TABS.find(t => t.id === activeTab).icon, { size: 18, color: 'var(--accent)' })}
              {TABS.find(t => t.id === activeTab).label}
            </h3>

            {activeTab === 'personal' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1.5rem' }}>
                  <Field label="Full Name" field="name" placeholder="Your name" formData={formData} handleChange={handleChange} />
                  <Field label="Email" type="email" field="email" placeholder="your@email.com" formData={formData} handleChange={handleChange} />
                  <Field label="Phone" type="tel" field="phone" placeholder="+91 00000 00000" formData={formData} handleChange={handleChange} />
                  <Field label="Date of Birth" type="date" field="dob" formData={formData} handleChange={handleChange} />
                  <Field label="Gender" field="gender" options={['', 'Male', 'Female', 'Non-binary', 'Prefer not to say']} formData={formData} handleChange={handleChange} />
                  <Field label="Blood Type" field="bloodType" options={['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} formData={formData} handleChange={handleChange} />
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <label className="label-caps" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '8px', color: 'var(--text-3)' }}>Bio / About Me</label>
                  <textarea
                    className="form-input"
                    value={formData.bio}
                    onChange={e => handleChange('bio', e.target.value)}
                    placeholder="Short bio..."
                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
              </>
            )}

            {activeTab === 'location' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1.5rem' }}>
                <Field label="City / Region" field="location_name" placeholder="e.g. San Francisco, CA" formData={formData} handleChange={handleChange} />
                <Field label="Nationality" field="nationality" placeholder="e.g. American" formData={formData} handleChange={handleChange} />
                <Field label="Language" field="language" options={['English', 'Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam', 'French', 'Spanish', 'German', 'Japanese']} formData={formData} handleChange={handleChange} />
              </div>
            )}

            {activeTab === 'physical' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Core Metrics</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem 1.5rem' }}>
                    <Field label="Height (cm)" type="number" field="height" placeholder="175" formData={formData} handleChange={handleChange} />
                    <Field label="Weight (kg)" type="number" field="weight" placeholder="70" formData={formData} handleChange={handleChange} />
                    <Field label="Body Fat (%)" type="number" field="bodyFat" placeholder="15" formData={formData} handleChange={handleChange} />
                    <Field label="Resting Heart Rate (bpm)" type="number" field="restingHeartRate" placeholder="60" formData={formData} handleChange={handleChange} />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Nutrition & Activity</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem 1.5rem' }}>
                    <Field label="Maintenance Calories (TDEE)" type="number" field="maintenanceCalories" placeholder="2500" formData={formData} handleChange={handleChange} />
                    <Field label="Activity Level" field="activityLevel" options={['', 'sedentary', 'light', 'moderate', 'active', 'very_active']} formData={formData} handleChange={handleChange} />
                    <Field label="Training Style" field="trainingStyle" options={['', 'Weightlifting', 'Cardio / Running', 'Calisthenics', 'Yoga / Pilates', 'Mixed / Hybrid']} formData={formData} handleChange={handleChange} />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Body Measurements (cm)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem 1.5rem' }}>
                    <Field label="Chest" type="number" field="chest" placeholder="100" formData={formData} handleChange={handleChange} />
                    <Field label="Shoulders" type="number" field="shoulders" placeholder="115" formData={formData} handleChange={handleChange} />
                    <Field label="Waist" type="number" field="waist" placeholder="80" formData={formData} handleChange={handleChange} />
                    <Field label="Arms" type="number" field="arms" placeholder="35" formData={formData} handleChange={handleChange} />
                    <Field label="Thighs" type="number" field="thighs" placeholder="55" formData={formData} handleChange={handleChange} />
                    <Field label="Calves" type="number" field="calves" placeholder="38" formData={formData} handleChange={handleChange} />
                    <Field label="Neck" type="number" field="neck" placeholder="38" formData={formData} handleChange={handleChange} />
                    <Field label="Forearms" type="number" field="forearm" placeholder="28" formData={formData} handleChange={handleChange} />
                    <Field label="Hips" type="number" field="hips" placeholder="90" formData={formData} handleChange={handleChange} />
                    <Field label="Glutes" type="number" field="glutes" placeholder="95" formData={formData} handleChange={handleChange} />
                    <Field label="Ankles" type="number" field="ankle" placeholder="22" formData={formData} handleChange={handleChange} />
                    <Field label="D-Size" type="number" field="d_size" placeholder="-" formData={formData} handleChange={handleChange} />
                    <Field label="D-Girth" type="number" field="d_girth" placeholder="-" formData={formData} handleChange={handleChange} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'goals' && (
              <div>
                <Field label="Primary Goal Focus" field="primaryGoal" options={['', 'Lose Fat', 'Build Muscle', 'Recomposition', 'Improve Endurance', 'Improve Flexibility', 'General Wellness']} formData={formData} handleChange={handleChange} />
              </div>
            )}

            {activeTab === 'prefs' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Enable Notifications</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Receive alerts for daily check-ins and goals.</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.notifications} onChange={e => handleChange('notifications', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: formData.notifications ? 'var(--accent)' : 'var(--bg-dark)',
                    borderRadius: '26px', transition: '0.3s',
                    border: '1px solid var(--border)'
                  }}>
                    <span style={{
                      position: 'absolute', content: '', height: '18px', width: '18px', left: formData.notifications ? '25px' : '4px', bottom: '3px',
                      background: 'white', borderRadius: '50%', transition: '0.3s',
                    }} />
                  </span>
                </label>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
