import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  User, Camera, Save, X, Upload, CheckCircle,
  MapPin, Shield, Flag, Bell, Layout, Globe,
  MessageCircle, Trash2, Plus, Info
} from 'lucide-react';
import useStore, { apiSync } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import StunningDatePicker from './ui/StunningDatePicker';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'social', label: 'Social & Web', icon: Globe },
  { id: 'location', label: 'Location & Language', icon: MapPin },
  { id: 'physical', label: 'Physical Stats', icon: Shield },
  { id: 'goals', label: 'Primary Goal', icon: Flag },
  { id: 'prefs', label: 'Preferences', icon: Bell },
];

const SOCIAL_THEMES = {
  GitHub: { icon: Globe, color: 'var(--text-1)', bg: 'var(--bg-elevated)' },
  LinkedIn: { icon: Globe, color: '#0a66c2', bg: '#eef3f8' },
  Twitter: { icon: Globe, color: '#1da1f2', bg: '#e8f5fd' },
  Instagram: { icon: Globe, color: '#e1306c', bg: '#fdf4f7' },
  YouTube: { icon: Globe, color: '#ff0000', bg: '#fff0f0' },
  Facebook: { icon: Globe, color: '#1877f2', bg: '#ebf5ff' },
  Discord: { icon: MessageCircle, color: '#5865F2', bg: '#eef0ff' },
  Website: { icon: Globe, color: 'var(--accent)', bg: 'var(--bg-elevated)' },
  Other: { icon: Globe, color: 'var(--text-2)', bg: 'var(--bg-elevated)' }
};

const Field = ({ label, type = 'text', field, placeholder, options, formData, handleChange, prefix }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <label className="label-caps" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '8px', color: 'var(--text-2)', letterSpacing: '0.12em', fontWeight: 800 }}>{label}</label>
    {options ? (
      <select
        className="form-input"
        value={field.includes('.') ? formData[field.split('.')[0]]?.[field.split('.')[1]] : formData[field]}
        onChange={e => handleChange(field, e.target.value)}
        style={{ width: '100%', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var(--font-display)' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <span style={{ position: 'absolute', left: '16px', color: 'var(--text-3)', fontSize: '0.95rem', fontWeight: 600, pointerEvents: 'none' }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          className="form-input"
          value={field.includes('.') ? formData[field.split('.')[0]]?.[field.split('.')[1]] || '' : formData[field] || ''}
          onChange={e => handleChange(field, e.target.value)}
          placeholder={placeholder}
          style={{ 
            width: '100%', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var(--font-display)',
            paddingLeft: prefix ? `calc(18px + ${prefix.length}ch)` : undefined 
          }}
        />
      </div>
    )}
  </div>
);

const RangeField = ({ label, field, min = 0, max = 1, step = 0.05, formData, handleChange }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
      <label className="label-caps" style={{ fontSize: '0.72rem', color: 'var(--text-2)', letterSpacing: '0.12em', fontWeight: 800 }}>{label}</label>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)' }}>{formData[field] ?? 0.5}</span>
    </div>
    <input
      type="range"
      min={min} max={max} step={step}
      value={formData[field] ?? 0.5}
      onChange={e => handleChange(field, parseFloat(e.target.value))}
      style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
    />
  </div>
);

export default function ProfileEditor() {
  const user = useStore(s => s.user);
  const updateUser = useStore(s => s.updateUser);
  const fetchInitialData = useStore(s => s.fetchInitialData);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('personal');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [showGithubInfo, setShowGithubInfo] = useState(false);

  // Password change local state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Social Links state
  const [newSocialPlatform, setNewSocialPlatform] = useState('GitHub');
  const [newSocialCustomName, setNewSocialCustomName] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  
  // Language state
  const [newLanguage, setNewLanguage] = useState('');
  const [newProficiency, setNewProficiency] = useState('Native');

  // Cropper states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [cropperModalOpen, setCropperModalOpen] = useState(false);

  useEffect(() => {
    if (user && !isLoaded) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        githubUsername: user?.githubUsername || '',
        bio: user?.bio || '',
        location_name: user?.location_name || '',
        nationality: user?.nationality || '',
        language: user?.language || 'English',
        timezone: user?.timezone || '',
        occupation: user?.occupation || '',
        education: user?.education || '',
        maritalStatus: user?.maritalStatus || '',
        incomeBracket: user?.incomeBracket || '',
        livingSituation: user?.livingSituation || '',
        dietaryPreference: user?.dietaryPreference || '',
        socialLinks: user?.socialLinks || [
          user?.githubUsername && { id: 'init-1', platform: 'GitHub', url: user.githubUsername },
          user?.linkedin && { id: 'init-2', platform: 'LinkedIn', url: user.linkedin },
          user?.twitter && { id: 'init-3', platform: 'Twitter', url: user.twitter },
          user?.instagram && { id: 'init-4', platform: 'Instagram', url: user.instagram },
          user?.website && { id: 'init-5', platform: 'Website', url: user.website }
        ].filter(Boolean),
        emergencyContactName: user?.emergencyContactName || '',
        emergencyContactPhone: user?.emergencyContactPhone || '',
        medicalConditions: user?.medicalConditions || '',
        allergies: user?.allergies || '',
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
        
        // Skeletal & Posture
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
        torsoLength: user?.torsoLength || '',
        upperArm: user?.upperArm || '',
        lowerArm: user?.lowerArm || '',
        handLength: user?.handLength || '',
        legLength: user?.legLength || '',
        footLength: user?.footLength || '',
        headCirc: user?.headCirc || '',
        d_size: user?.d_size || '',
        d_girth: user?.d_girth || '',
        
        baseCurrency: user?.baseCurrency || '',
        isdCode: user?.isdCode || '',
        netWorth: user?.netWorth || '',
        primaryBank: user?.primaryBank || '',
        idType: user?.idType || '',
        idNumber: user?.idNumber || '',
        passportNationality: user?.passportNationality || '',
        languages: user?.languages || [],
        country: user?.country || '',
        state: user?.state || '',
        city: user?.city || '',
        timezone: user?.timezone || '',
        
        skinTone: user?.skinTone || 'III',
        headTiltAngle: user?.headTiltAngle || 0,
        pelvicTilt: user?.pelvicTilt || 0,
        shoulderRounding: user?.shoulderRounding || 0,
        
        dateFormat: user?.dateFormat || 'MM/DD/YYYY',
        measurementSystem: user?.measurementSystem || 'Metric (cm, kg)',
        textDirection: user?.textDirection || 'LTR (Left to Right)',
        motherLanguage: user?.motherLanguage || '',
        motherLanguageProficiency: user?.motherLanguageProficiency || 'Native',
        
        brow_depth: user?.brow_depth ?? 0.5,
        nose_bridge_width: user?.nose_bridge_width ?? 0.5,
        nose_tip_size: user?.nose_tip_size ?? 0.5,
        ear_prominence: user?.ear_prominence ?? 0.5,
        jaw_width: user?.jaw_width ?? 0.5,
        chin_projection: user?.chin_projection ?? 0.5,
        lip_fullness: user?.lip_fullness ?? 0.5,
        eye_size: user?.eye_size ?? 0.5,
        
        primaryGoal: user?.primaryGoal || '',
        notifications: user?.notifications ?? true,
        theme: user?.theme || 'dark',

        githubManageEnabled: user?.githubManageEnabled ?? false,
        githubAuthMode: user?.githubAuthMode || 'pat',
        githubToken: user?.githubToken || '',
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
      githubUsername: user?.githubUsername || '',
      bio: user?.bio || '',
      location_name: user?.location_name || '',
      nationality: user?.nationality || '',
      language: user?.language || 'English',
      timezone: user?.timezone || '',
      occupation: user?.occupation || '',
      education: user?.education || '',
      maritalStatus: user?.maritalStatus || '',
      incomeBracket: user?.incomeBracket || '',
      livingSituation: user?.livingSituation || '',
      dietaryPreference: user?.dietaryPreference || '',
      socialLinks: user?.socialLinks || [
        user?.githubUsername && { id: 'init-1', platform: 'GitHub', url: user.githubUsername },
        user?.linkedin && { id: 'init-2', platform: 'LinkedIn', url: user.linkedin },
        user?.twitter && { id: 'init-3', platform: 'Twitter', url: user.twitter },
        user?.instagram && { id: 'init-4', platform: 'Instagram', url: user.instagram },
        user?.website && { id: 'init-5', platform: 'Website', url: user.website }
      ].filter(Boolean),
      emergencyContactName: user?.emergencyContactName || '',
      emergencyContactPhone: user?.emergencyContactPhone || '',
      medicalConditions: user?.medicalConditions || '',
      allergies: user?.allergies || '',
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
      torsoLength: user?.torsoLength || '',
      upperArm: user?.upperArm || '',
      lowerArm: user?.lowerArm || '',
      handLength: user?.handLength || '',
      legLength: user?.legLength || '',
      footLength: user?.footLength || '',
      headCirc: user?.headCirc || '',
      d_size: user?.d_size || '',
      d_girth: user?.d_girth || '',
      
      skinTone: user?.skinTone || 'III',
      headTiltAngle: user?.headTiltAngle || 0,
      pelvicTilt: user?.pelvicTilt || 0,
      shoulderRounding: user?.shoulderRounding || 0,
      
      dateFormat: user?.dateFormat || 'MM/DD/YYYY',
      measurementSystem: user?.measurementSystem || 'Metric (cm, kg)',
      textDirection: user?.textDirection || 'LTR (Left to Right)',
      motherLanguage: user?.motherLanguage || '',
      motherLanguageProficiency: user?.motherLanguageProficiency || 'Native',
      
      brow_depth: user?.brow_depth ?? 0.5,
      nose_bridge_width: user?.nose_bridge_width ?? 0.5,
      nose_tip_size: user?.nose_tip_size ?? 0.5,
      ear_prominence: user?.ear_prominence ?? 0.5,
      jaw_width: user?.jaw_width ?? 0.5,
      chin_projection: user?.chin_projection ?? 0.5,
      lip_fullness: user?.lip_fullness ?? 0.5,
      eye_size: user?.eye_size ?? 0.5,
      
      primaryGoal: user?.primaryGoal || '',
      notifications: user?.notifications ?? true,
      theme: user?.theme || 'dark',
      
      githubManageEnabled: user?.githubManageEnabled ?? false,
      githubAuthMode: user?.githubAuthMode || 'pat',
      githubToken: user?.githubToken || '',
    }) || avatarPreview !== (user?.avatar || null);
    
    setHasChanges(isChanged);
  }, [formData, avatarPreview, user]);

  // Check for GitHub OAuth Code on Mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code && !isLoaded) {
      toast.info('Authenticating with GitHub...');
      fetch('http://localhost:3001/auth/github/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      .then(res => res.json())
      .then(data => {
        if (data.access_token) {
          updateUser({ githubToken: data.access_token, githubAuthMode: 'oauth', githubManageEnabled: true });
          toast.success('GitHub connected successfully!');
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          toast.error(data.error || 'Failed to connect to GitHub');
        }
      })
      .catch(e => toast.error('Error connecting to GitHub'));
    }
  }, []);

  const handleAvatarClick = () => {
    if (avatarPreview) setIsPreviewModalOpen(true);
    else fileInputRef.current?.click();
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
    reader.onloadend = () => {
      setImageToCrop(reader.result);
      setCropperModalOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleUploadCropped = async () => {
    try {
      setCropperModalOpen(false);
      setAvatarUploading(true);
      
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedImageBlob) throw new Error('Crop failed');

      const body = new FormData();
      body.append('avatar', croppedImageBlob, 'avatar.jpg');
      const result = await apiSync('/profile/avatar', 'POST', body, { raw: true });
      const url = result?.url || result?.avatar || null;
      if (url) {
        setAvatarPreview(url);
      } else {
        const objectUrl = URL.createObjectURL(croppedImageBlob);
        setAvatarPreview(objectUrl);
      }
      setHasChanges(true);
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setAvatarUploading(false);
      setImageToCrop(null);
    }
  };

  const handleSyncFromCountry = () => {
    const c = (formData.country || '').toLowerCase().trim();
    if (!c) {
      toast.error('Please enter a country in the Location tab first');
      return;
    }

    const updates = {};
    if (c.includes('united states') || c === 'us' || c === 'usa') {
      updates.baseCurrency = 'USD ($)';
      updates.isdCode = '+1';
      updates.dateFormat = 'MM/DD/YYYY';
      updates.measurementSystem = 'Imperial (inches, lbs)';
      updates.textDirection = 'LTR (Left to Right)';
      updates.motherLanguage = 'English';
    } else if (c.includes('india') || c === 'in') {
      updates.baseCurrency = 'INR (₹)';
      updates.isdCode = '+91';
      updates.dateFormat = 'DD/MM/YYYY';
      updates.measurementSystem = 'Metric (cm, kg)';
      updates.textDirection = 'LTR (Left to Right)';
    } else if (c.includes('united kingdom') || c === 'uk') {
      updates.baseCurrency = 'GBP (£)';
      updates.isdCode = '+44';
      updates.dateFormat = 'DD/MM/YYYY';
      updates.measurementSystem = 'Metric (cm, kg)';
      updates.textDirection = 'LTR (Left to Right)';
      updates.motherLanguage = 'English';
    } else if (c.includes('canada') || c === 'ca') {
      updates.baseCurrency = 'CAD ($)';
      updates.isdCode = '+1';
      updates.dateFormat = 'MM/DD/YYYY';
      updates.measurementSystem = 'Metric (cm, kg)';
      updates.textDirection = 'LTR (Left to Right)';
      updates.motherLanguage = 'English';
    } else if (c.includes('australia') || c === 'au') {
      updates.baseCurrency = 'AUD ($)';
      updates.isdCode = '+61';
      updates.dateFormat = 'DD/MM/YYYY';
      updates.measurementSystem = 'Metric (cm, kg)';
      updates.textDirection = 'LTR (Left to Right)';
      updates.motherLanguage = 'English';
    } else if (c.includes('uae') || c.includes('emirates')) {
      updates.baseCurrency = 'Other'; // AED
      updates.isdCode = '+971';
      updates.dateFormat = 'DD/MM/YYYY';
      updates.measurementSystem = 'Metric (cm, kg)';
      updates.textDirection = 'RTL (Right to Left)';
      updates.motherLanguage = 'Arabic';
    } else if (c.includes('japan') || c === 'jp') {
      updates.baseCurrency = 'JPY (¥)';
      updates.isdCode = '+81';
      updates.dateFormat = 'YYYY-MM-DD';
      updates.measurementSystem = 'Metric (cm, kg)';
      updates.textDirection = 'LTR (Left to Right)';
      updates.motherLanguage = 'Japanese';
    } else {
      toast.error('No auto-sync data available for this country. Please set manually.');
      return;
    }

    setFormData({ ...formData, ...updates });
    setHasChanges(true);
    toast.success('Culture & Formatting synced to ' + formData.country);
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

  const handleAddLink = () => {
    if (!newSocialUrl.trim()) return;
    const isCustom = newSocialPlatform === 'Other';
    const finalPlatform = isCustom && newSocialCustomName.trim() ? newSocialCustomName.trim() : newSocialPlatform;
    
    const newLink = {
      id: Date.now().toString(),
      platform: finalPlatform,
      url: newSocialUrl.trim()
    };
    
    setFormData({ ...formData, socialLinks: [...(formData.socialLinks || []), newLink] });
    setNewSocialUrl('');
    if (isCustom) setNewSocialCustomName('');
    setHasChanges(true);
  };

  const handleAddLanguage = () => {
    if (!newLanguage.trim()) return;
    const lang = { id: Date.now().toString(), language: newLanguage.trim(), proficiency: newProficiency };
    setFormData({ ...formData, languages: [...(formData.languages || []), lang] });
    setNewLanguage('');
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword) {
        toast.error('Current password is required to change password');
        return;
      }
      if (!newPassword) {
        toast.error('New password is required');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('New password must be at least 6 characters');
        return;
      }
    }

    try {
      const submitData = { ...formData };
      
      // Sync GitHub back to top level for Projects compatibility
      const gh = submitData.socialLinks?.find(l => l.platform === 'GitHub');
      if (gh) submitData.githubUsername = gh.url.replace(/.*github\.com\//, '');
      
      if (avatarPreview && avatarPreview !== user?.avatar) submitData.avatar = avatarPreview;
      if (!avatarPreview) submitData.avatar = null;

      // 1. Save general profile data locally (Zustand)
      await updateUser(submitData);

      // 2. If credentials (name, email, or password) are being updated, hit PUT /api/auth/profile
      const hasCredsChanges = 
        formData.name !== user?.name || 
        formData.email !== user?.email ||
        newPassword;

      if (hasCredsChanges) {
        const token = sessionStorage.getItem('growthtrack-session-token');
        const AUTH_API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3001';
        
        const res = await fetch(`${AUTH_API_BASE}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            currentPassword: currentPassword || undefined,
            newPassword: newPassword || undefined
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to update login credentials');
        }

        const resData = await res.json();
        // Update user state in store with actual DB saved credentials
        updateUser({
          name: resData.user.fullName,
          email: resData.user.email
        });
        
        // Update sessionStorage user context so logs can get updated details
        sessionStorage.setItem('growthtrack-user', JSON.stringify({
          id: resData.user.id,
          email: resData.user.email,
          fullName: resData.user.fullName
        }));
      }

      toast.success('Profile saved successfully');
      setHasChanges(false);
      
      // Clear password inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    }
  };

  const currencySymbol = (formData.baseCurrency || '').match(/\(([^)]+)\)/)?.[1] || '$';

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
                  padding: '14px 18px', borderRadius: '12px',
                  background: isActive ? 'var(--bg-elevated)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.01em',
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
                  width: '96px', height: '96px', borderRadius: '50%',
                  background: avatarPreview ? 'transparent' : 'var(--bg-elevated)',
                  border: avatarPreview ? 'none' : '2px dashed var(--border-strong)', 
                  boxShadow: avatarPreview ? 'var(--shadow-card)' : 'none',
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative',
                  transition: 'all 0.3s var(--ease)'
                }}
                title="Click to view or upload photo"
              >
                {avatarUploading ? (
                  <div className="spinner" style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : avatarPreview ? (
                  <img src={avatarPreview} alt={user?.name || 'Profile'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={32} color="var(--text-3)" />
                )}
              </div>

              {!avatarUploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  title="Upload new picture"
                  style={{
                    position: 'absolute', bottom: '-2px', right: '-2px',
                    background: 'var(--accent)', border: '2px solid var(--bg-surface)',
                    borderRadius: '50%', width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', cursor: 'pointer', zIndex: 10
                  }}>
                  <Camera size={14} />
                </button>
              )}

              {avatarPreview && (
                <button
                  onClick={removeAvatar}
                  style={{ 
                    position: 'absolute', top: '-2px', right: '-2px', 
                    background: 'var(--danger)', border: '2px solid var(--bg-surface)', 
                    borderRadius: '50%', width: '28px', height: '28px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    cursor: 'pointer', color: 'white',
                    boxShadow: '0 4px 12px rgba(248, 113, 113, 0.4)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Remove photo"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 900, fontSize: '1.5rem', marginBottom: '0.25rem' }}>{formData.name || 'Unnamed Operator'}</h3>
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{formData.email || 'No email set'}</p>
            </div>
          </div>

          {/* Active Tab Panel */}
          <div className="glass-card" style={{ padding: '2.5rem 2rem', overflow: 'visible' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {React.createElement(TABS.find(t => t.id === activeTab).icon, { size: 18, color: 'var(--accent)' })}
              {TABS.find(t => t.id === activeTab).label}
            </h3>

            {activeTab === 'personal' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1.5rem' }}>
                  <Field label="Full Name" field="name" placeholder="Your name" formData={formData} handleChange={handleChange} />
                  <Field label="Email" type="email" field="email" placeholder="your@email.com" formData={formData} handleChange={handleChange} />
                  <Field label="Phone" type="tel" field="phone" placeholder="00000 00000" prefix={formData.isdCode} formData={formData} handleChange={handleChange} />
                  <StunningDatePicker label="Date of Birth" value={formData.dob} onChange={(val) => handleChange('dob', val)} />
                  <Field label="Gender" field="gender" options={['', 'Male', 'Female', 'Non-binary', 'Prefer not to say']} formData={formData} handleChange={handleChange} />
                  <Field label="Blood Type" field="bloodType" options={['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} formData={formData} handleChange={handleChange} />
                  <Field label="Marital Status" field="maritalStatus" options={['', 'Single', 'Married', 'In a Relationship', 'Divorced', 'Widowed', 'Prefer not to say']} formData={formData} handleChange={handleChange} />
                  <Field label="Living Situation" field="livingSituation" options={['', 'Living Alone', 'Living with Partner/Spouse', 'Living with Parents', 'Living with Roommates', 'Other']} formData={formData} handleChange={handleChange} />
                  <Field label="Occupation" field="occupation" placeholder="e.g. Software Engineer" formData={formData} handleChange={handleChange} />
                  <Field label="Annual Income" field="incomeBracket" type="number" placeholder="e.g. 75000" prefix={currencySymbol} formData={formData} handleChange={handleChange} />
                  <Field label="Education Level" field="education" options={['', 'High School', 'Associate Degree', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate (PhD)', 'Other']} formData={formData} handleChange={handleChange} />
                </div>
                
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '1rem' }}>Financial Data</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1.5rem' }}>
                    <Field label="Approx. Net Worth" field="netWorth" type="number" placeholder="50000" prefix={currencySymbol} formData={formData} handleChange={handleChange} />
                    <Field label="Primary Bank" field="primaryBank" placeholder="e.g. Chase" formData={formData} handleChange={handleChange} />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '1rem' }}>Identification</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1.5rem' }}>
                    <Field label="National ID Type" field="idType" options={['', 'SSN', 'Aadhaar', 'NIN', 'Driving License', 'Other']} formData={formData} handleChange={handleChange} />
                    <Field label="ID Number" field="idNumber" type="password" placeholder="••••••••" formData={formData} handleChange={handleChange} />
                    <Field label="Passport Nationality" field="passportNationality" placeholder="e.g. United States" formData={formData} handleChange={handleChange} />
                  </div>
                </div>

                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Security & Credentials</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1.5rem' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label className="label-caps" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '8px', color: 'var(--text-2)', letterSpacing: '0.12em', fontWeight: 800 }}>Current Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={currentPassword}
                        onChange={e => { setCurrentPassword(e.target.value); setHasChanges(true); }}
                        placeholder="••••••••"
                        style={{ width: '100%', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var(--font-display)' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label className="label-caps" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '8px', color: 'var(--text-2)', letterSpacing: '0.12em', fontWeight: 800 }}>New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setHasChanges(true); }}
                        placeholder="••••••••"
                        style={{ width: '100%', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var(--font-display)' }}
                      />
                    </div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label className="label-caps" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '8px', color: 'var(--text-2)', letterSpacing: '0.12em', fontWeight: 800 }}>Confirm New Password</label>
                      <input
                        type="password"
                        className="form-input"
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setHasChanges(true); }}
                        placeholder="••••••••"
                        style={{ width: '100%', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var(--font-display)' }}
                      />
                    </div>
                  </div>
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

            {activeTab === 'social' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Current Links */}
                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Links</h4>
                  
                  {formData.socialLinks?.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                      <Globe size={32} color="var(--text-3)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', margin: 0 }}>No social links added yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                      {formData.socialLinks?.map((link) => {
                        const theme = SOCIAL_THEMES[link.platform] || SOCIAL_THEMES.Other;
                        return (
                          <div key={link.id} style={{ 
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                            background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px' 
                          }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: theme.bg, color: theme.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {React.createElement(theme.icon, { size: 20 })}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{link.platform}</div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.url}</div>
                            </div>
                            <button className="btn-icon" style={{ color: 'var(--danger)', opacity: 0.7 }}
                              onClick={() => {
                                setFormData({ ...formData, socialLinks: formData.socialLinks.filter(l => l.id !== link.id) });
                                setHasChanges(true);
                              }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add New Link */}
                <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={16} color="var(--accent)" /> Add New Link
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: newSocialPlatform === 'Other' ? '1fr 1fr 2fr auto' : '1fr 2fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                    <div>
                      <label className="label-caps" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '8px', color: 'var(--text-2)' }}>Platform</label>
                      <select className="form-input" value={newSocialPlatform} onChange={e => setNewSocialPlatform(e.target.value)} style={{ width: '100%', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var(--font-display)' }}>
                        {Object.keys(SOCIAL_THEMES).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    {newSocialPlatform === 'Other' && (
                      <div>
                        <label className="label-caps" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '8px', color: 'var(--text-2)' }}>Custom Name</label>
                        <input className="form-input" value={newSocialCustomName} onChange={e => setNewSocialCustomName(e.target.value)} placeholder="e.g. Substack" style={{ width: '100%', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var(--font-display)' }} />
                      </div>
                    )}
                    <div>
                      <label className="label-caps" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '8px', color: 'var(--text-2)' }}>URL or Username</label>
                      <input className="form-input" placeholder="e.g. https://... or @username" value={newSocialUrl} onChange={e => setNewSocialUrl(e.target.value)} style={{ width: '100%', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var(--font-display)' }} />
                    </div>
                    <button className="btn-primary" style={{ height: '42px', padding: '0 1.5rem' }} onClick={handleAddLink}>
                      Add
                    </button>
                  </div>
                </div>

                {/* GitHub Integration */}
                <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Globe size={16} color="var(--accent)" /> Advanced GitHub Management
                      <button className="btn-icon" onClick={() => setShowGithubInfo(!showGithubInfo)} style={{ padding: '2px' }} title="Learn about GitHub Authentication">
                        <Info size={14} color="var(--text-3)" />
                      </button>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formData.githubManageEnabled} onChange={e => handleChange('githubManageEnabled', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        background: formData.githubManageEnabled ? 'var(--accent)' : 'var(--bg-dark)',
                        borderRadius: '26px', transition: '0.3s', border: '1px solid var(--border)'
                      }}>
                        <span style={{
                          position: 'absolute', content: '""', height: '14px', width: '14px', left: formData.githubManageEnabled ? '20px' : '4px', bottom: '3px',
                          background: 'white', borderRadius: '50%', transition: '0.3s',
                        }} />
                      </span>
                    </label>
                  </h4>
                  {showGithubInfo && (
                    <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-2)' }}>
                      <strong style={{ color: 'var(--text-1)' }}>How it works:</strong>
                      <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <li><strong>Personal Access Token:</strong> Generates a long-lived token directly from your GitHub Developer Settings. Faster to set up and ideal for personal local use. Requires the `repo` and `delete_repo` scopes.</li>
                        <li><strong>Login with GitHub:</strong> Uses OAuth for a seamless 1-click login. Secure, industry-standard, and recommended for shared or production environments.</li>
                      </ul>
                    </div>
                  )}
                  
                  {formData.githubManageEnabled && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                          className={formData.githubAuthMode === 'pat' ? 'btn-primary' : 'btn-secondary'} 
                          onClick={() => handleChange('githubAuthMode', 'pat')}
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
                          Personal Access Token (Faster)
                        </button>
                        <button 
                          className={formData.githubAuthMode === 'oauth' ? 'btn-primary' : 'btn-secondary'} 
                          onClick={() => handleChange('githubAuthMode', 'oauth')}
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
                          Login with GitHub (Premium)
                        </button>
                      </div>

                      {formData.githubAuthMode === 'pat' && (
                        <div>
                          <label className="label-caps" style={{ fontSize: '0.72rem', display: 'block', marginBottom: '8px', color: 'var(--text-2)' }}>GitHub PAT (repo scope)</label>
                          <input type="password" placeholder="ghp_xxxxxxxxxxx" className="form-input" value={formData.githubToken} onChange={e => handleChange('githubToken', e.target.value)} style={{ width: '100%' }} />
                        </div>
                      )}
                      
                      {formData.githubAuthMode === 'oauth' && (
                        <div>
                          <button 
                            className="btn-primary" 
                            style={{ width: '100%', padding: '0.75rem', background: '#333' }}
                            onClick={() => {
                              const clientId = 'YOUR_GITHUB_CLIENT_ID'; // Ensure this matches env setup
                              // Wait, for this to be premium we redirect to GitHub:
                              window.location.href = `https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GITHUB_CLIENT_ID || 'Iv23libdZ6QyY41I4v8M'}&scope=repo,delete_repo`;
                            }}>
                            {formData.githubToken ? 'Reconnect GitHub' : 'Connect with GitHub'}
                          </button>
                          {formData.githubToken && <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '8px', textAlign: 'center' }}>✓ Authenticated via OAuth</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

            {activeTab === 'location' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1.5rem' }}>
                <Field label="City / Region" field="location_name" placeholder="e.g. San Francisco, CA" formData={formData} handleChange={handleChange} />
                <Field label="Nationality" field="nationality" placeholder="e.g. American" formData={formData} handleChange={handleChange} />
                <Field label="Language" field="language" options={['English', 'Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam', 'French', 'Spanish', 'German', 'Japanese']} formData={formData} handleChange={handleChange} />
                <Field label="Timezone" field="timezone" options={['', 'UTC-12:00', 'UTC-08:00 (Pacific)', 'UTC-05:00 (Eastern)', 'UTC+00:00 (GMT)', 'UTC+01:00 (CET)', 'UTC+05:30 (IST)', 'UTC+08:00 (CST)', 'UTC+09:00 (JST)', 'UTC+10:00 (AEST)']} formData={formData} handleChange={handleChange} />
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
                    <Field label="Dietary Preference" field="dietaryPreference" options={['', 'Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Halal', 'Kosher']} formData={formData} handleChange={handleChange} />
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

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Skeletal Proportions (cm)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem 1.5rem' }}>
                    <Field label="Torso Length" type="number" field="torsoLength" placeholder="-" formData={formData} handleChange={handleChange} />
                    <Field label="Upper Arm" type="number" field="upperArm" placeholder="-" formData={formData} handleChange={handleChange} />
                    <Field label="Lower Arm" type="number" field="lowerArm" placeholder="-" formData={formData} handleChange={handleChange} />
                    <Field label="Hand Length" type="number" field="handLength" placeholder="-" formData={formData} handleChange={handleChange} />
                    <Field label="Leg Length (Inseam)" type="number" field="legLength" placeholder="-" formData={formData} handleChange={handleChange} />
                    <Field label="Foot Length" type="number" field="footLength" placeholder="-" formData={formData} handleChange={handleChange} />
                    <Field label="Head Circumference" type="number" field="headCirc" placeholder="-" formData={formData} handleChange={handleChange} />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Appearance & Posture</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem 1.5rem' }}>
                    <Field label="Skin Tone (Fitzpatrick)" field="skinTone" options={['I', 'II', 'III', 'IV', 'V', 'VI']} formData={formData} handleChange={handleChange} />
                    <Field label="Head Tilt Angle (deg)" type="number" field="headTiltAngle" placeholder="0" formData={formData} handleChange={handleChange} />
                    <Field label="Pelvic Tilt (deg)" type="number" field="pelvicTilt" placeholder="0" formData={formData} handleChange={handleChange} />
                    <Field label="Shoulder Rounding (deg)" type="number" field="shoulderRounding" placeholder="0" formData={formData} handleChange={handleChange} />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Facial Morphology (0-1 Scale)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem 1.5rem', background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <RangeField label="Jaw Width" field="jaw_width" formData={formData} handleChange={handleChange} />
                    <RangeField label="Chin Projection" field="chin_projection" formData={formData} handleChange={handleChange} />
                    <RangeField label="Lip Fullness" field="lip_fullness" formData={formData} handleChange={handleChange} />
                    <RangeField label="Eye Size" field="eye_size" formData={formData} handleChange={handleChange} />
                    <RangeField label="Brow Depth" field="brow_depth" formData={formData} handleChange={handleChange} />
                    <RangeField label="Nose Bridge Width" field="nose_bridge_width" formData={formData} handleChange={handleChange} />
                    <RangeField label="Nose Tip Size" field="nose_tip_size" formData={formData} handleChange={handleChange} />
                    <RangeField label="Ear Prominence" field="ear_prominence" formData={formData} handleChange={handleChange} />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Health & Emergency</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem 1.5rem' }}>
                    <Field label="Emergency Contact Name" field="emergencyContactName" placeholder="e.g. Jane Doe" formData={formData} handleChange={handleChange} />
                    <Field label="Emergency Contact Phone" type="tel" field="emergencyContactPhone" placeholder="00000 00000" prefix={formData.isdCode} formData={formData} handleChange={handleChange} />
                    <Field label="Known Allergies" field="allergies" placeholder="e.g. Peanuts, Penicillin" formData={formData} handleChange={handleChange} />
                    <Field label="Medical Conditions" field="medicalConditions" placeholder="e.g. Asthma, Hypertension" formData={formData} handleChange={handleChange} />
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Formatting & Culture</h4>
                    <button onClick={handleSyncFromCountry} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.7rem', height: 'auto', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                      Auto-Sync from Country
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1.5rem' }}>
                    <Field label="Base Currency" field="baseCurrency" options={['', 'USD ($)', 'EUR (€)', 'GBP (£)', 'INR (₹)', 'JPY (¥)', 'CAD ($)', 'AUD ($)', 'Other']} formData={formData} handleChange={handleChange} />
                    <Field label="ISD / Dial Code" field="isdCode" placeholder="e.g. +1 or +91" formData={formData} handleChange={handleChange} />
                    <Field label="Date Format" field="dateFormat" options={['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']} formData={formData} handleChange={handleChange} />
                    <Field label="Measurement System" field="measurementSystem" options={['Metric (cm, kg)', 'Imperial (inches, lbs)']} formData={formData} handleChange={handleChange} />
                    <Field label="Text Direction" field="textDirection" options={['LTR (Left to Right)', 'RTL (Right to Left)']} formData={formData} handleChange={handleChange} />
                  </div>
                </div>

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
              </div>
            )}

          </div>
        </div>
      </div>
      
      {/* Avatar Full-screen Preview Modal */}
      {isPreviewModalOpen && avatarPreview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setIsPreviewModalOpen(false)}>
          <button style={{ 
            position: 'absolute', top: '2rem', right: '2rem', 
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '50%', 
            color: 'white', cursor: 'pointer', padding: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
          }} onClick={() => setIsPreviewModalOpen(false)}
             onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
             onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <X size={24} />
          </button>
          <img src={avatarPreview} alt="Full Profile" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} />
        </div>
      )}

      {/* Cropper Modal */}
      {cropperModalOpen && imageToCrop && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
          zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
          <div style={{
            position: 'relative', width: '100%', maxWidth: '500px', height: '400px',
            background: '#333', borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          </div>
          
          <div style={{ marginTop: '2rem', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-elevated)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 700 }}>ZOOM</span>
              <input
                type="range"
                min={1} max={3} step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setCropperModalOpen(false); setImageToCrop(null); }} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleUploadCropped} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} /> Crop & Save
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
