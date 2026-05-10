import React, { useState, useRef } from 'react';
import { X, Save, Ruler, Activity, Zap, Camera, Upload, CheckCircle } from 'lucide-react';
import { BODY_METRICS_LIST, VITALS_METRICS_LIST, HOLISTIC_METRICS_LIST } from '../data/userData';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase'; // adjust path if needed
import { useToast } from '../hooks/useToast';

const PHOTO_BUCKET = 'progress-photos';

export default function MetricLogger({ onClose, onSave }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('body');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: 63, chest: 34.1, shoulders: 42.3, waist: 32.3,
    arms: 11.8, neck: 14.5, biceps: 11.8, hips: 34.6,
    thighs: 20.9, calves: 13.8, d_size: 5.9,
    sleep: 6, water: 2, caffeine: 3, stress: 7, hr: 75,
    eyePower: -2.5, memoryPower: 65, stamina: 40, flexibility: 15,
    hairHealth: 50, skinGlow: 40, sight: 60, hearing: 85,
    smell: 80, taste: 90, touch: 85,
  });

  // ── Photo upload state
  const [photoFile,     setPhotoFile]     = useState(null);
  const [photoPreview,  setPhotoPreview]  = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl,      setPhotoUrl]      = useState(null); // final public URL
  const fileInputRef = useRef();

  const storeUser    = useStore(state => state.user);
  const storeSetUser = useStore(state => state.setUser);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || value }));
  };

  // ── Photo file selected → preview
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Photo must be under 10MB.'); return; }
    setPhotoFile(file);
    setPhotoUrl(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Upload photo to Supabase Storage
  const uploadPhoto = async () => {
    if (!photoFile) return null;
    setUploadingPhoto(true);
    try {
      const ext  = photoFile.name.split('.').pop();
      const path = `${formData.date}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, photoFile, { upsert: false, contentType: photoFile.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      const url = urlData?.publicUrl;
      setPhotoUrl(url);
      toast.success('Photo uploaded ✓');
      return url;
    } catch (err) {
      console.error('Photo upload error', err);
      toast.error('Photo upload failed. Saving log without photo.');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Submit: upload photo first (if any), then save metric log + progress_entry
  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalPhotoUrl = photoUrl; // already uploaded?
    if (photoFile && !photoUrl) {
      finalPhotoUrl = await uploadPhoto();
    }

    // Save metric log (existing behaviour)
    await onSave({ ...formData });

    // If we have body measurements or photo, also POST to /api/progress_entries
    const hasBodyData = formData.weight || formData.chest || formData.waist || formData.hips || finalPhotoUrl;
    if (hasBodyData) {
      try {
        await fetch('/api/progress_entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date:      formData.date,
            weight:    formData.weight    || null,
            body_fat:  formData.body_fat  || null,
            chest:     formData.chest     || null,
            waist:     formData.waist     || null,
            hips:      formData.hips      || null,
            note:      formData.note      || null,
            photo_url: finalPhotoUrl      || null,
          }),
        });
      } catch (err) {
        console.error('progress_entries POST error', err);
      }
    }

    // Update main user profile if weight changed
    if (formData.weight && formData.weight !== storeUser?.weight) {
      storeSetUser({ ...storeUser, weight: formData.weight });
    }

    onClose();
  };

  const inputStyle = {
    width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-1)',
    textAlign: 'center', fontWeight: '600',
  };
  const unitStyle = {
    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
    fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 800,
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
    }}>
      <div className="glass-card stagger-item" style={{
        width: '100%', maxWidth: '600px', maxHeight: '90vh',
        padding: '2rem', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--accent)', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap color="var(--bg-base)" size={20} strokeWidth={3} />
            </div>
            <h3 className="text-display" style={{ fontSize: '1.8rem' }}>Universal Logger</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={28} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
          {[
            { key: 'body',     label: 'Body Metrics', icon: <Ruler size={16} /> },
            { key: 'vitals',   label: 'Bio-Vitals',   icon: <Activity size={16} /> },
            { key: 'holistic', label: 'Holistic',     icon: <Zap size={16} /> },
            { key: 'photo',    label: 'Photo',        icon: <Camera size={16} /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? 'var(--bg-base)' : 'var(--text-2)',
              fontWeight: 700, cursor: 'pointer', transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              fontSize: '0.78rem',
            }}>
              {tab.icon} {tab.label}
              {tab.key === 'photo' && photoUrl && (
                <CheckCircle size={12} color="#10b981" style={{ marginLeft: '2px' }} />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
          {/* Date (always visible) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="label-caps">Log Date</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required
              style={{ padding: '14px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-strong)', borderRadius: '12px', color: 'var(--text-1)', fontFamily: 'var(--font-body)', fontSize: '1rem' }} />
          </div>

          {/* Metric fields grid */}
          {activeTab !== 'photo' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', overflowY: 'auto', paddingRight: '4px', maxHeight: '360px' }}>
              {(activeTab === 'body' ? BODY_METRICS_LIST : activeTab === 'vitals' ? VITALS_METRICS_LIST : HOLISTIC_METRICS_LIST)
                .map(field => (
                  <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="label-caps" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{field.icon}</span> {field.label}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input type="number" step={field.step || '0.01'} name={field.id}
                        value={formData[field.id]} onChange={handleChange}
                        style={inputStyle}
                      />
                      <span style={unitStyle}>{field.unit.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Photo tab */}
          {activeTab === 'photo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '360px' }}>
              {/* Upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${photoPreview ? '#10b981' : 'var(--border)'}`,
                  borderRadius: '16px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                  background: photoPreview ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s',
                }}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="preview"
                    style={{ maxHeight: '220px', maxWidth: '100%', borderRadius: '12px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                ) : (
                  <>
                    <Camera size={32} color="var(--text-3)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', fontWeight: 600 }}>Click to select progress photo</p>
                    <p style={{ color: 'var(--text-3)', fontSize: '0.72rem', marginTop: '4px' }}>JPG, PNG, WEBP · max 10MB</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
              </div>

              {photoPreview && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {/* Upload now button */}
                  {!photoUrl ? (
                    <button type="button" className="btn-primary" style={{ flex: 1 }}
                      onClick={uploadPhoto} disabled={uploadingPhoto}>
                      {uploadingPhoto ? (
                        <><span className="spin" style={{ display: 'inline-block', marginRight: '6px' }}>&#8635;</span> Uploading…</>
                      ) : (
                        <><Upload size={14} /> Upload to Cloud</>
                      )}
                    </button>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px' }}>
                      <CheckCircle size={16} color="#10b981" />
                      <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>Uploaded ✓</span>
                    </div>
                  )}
                  {/* Clear */}
                  <button type="button" className="btn-secondary" onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoUrl(null); }}>
                    <X size={14} /> Clear
                  </button>
                </div>
              )}

              {/* Optional note */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="label-caps">Note (optional)</label>
                <input type="text" name="note" placeholder="e.g. 8 weeks bulk checkpoint"
                  value={formData.note || ''} onChange={handleChange}
                  style={{ ...inputStyle, textAlign: 'left', padding: '12px 14px' }} />
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '14px' }}>Discard</button>
            <button type="submit" className="btn-ghost" disabled={uploadingPhoto} style={{
              flex: 1, background: 'var(--accent)', color: 'var(--bg-base)',
              borderColor: 'var(--accent)', padding: '14px',
              boxShadow: '0 0 20px var(--accent-glow)', opacity: uploadingPhoto ? 0.6 : 1,
            }}>
              <Save size={18} style={{ marginRight: '8px' }} />
              {uploadingPhoto ? 'Uploading…' : 'Commit Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
