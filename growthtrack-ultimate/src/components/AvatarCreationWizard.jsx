import React, { useState, useEffect } from 'react';
import use3DStore from '../store/use3DStore';
import { ArrowRight, ArrowLeft, Check, Camera, Target, User, Shirt, Eye } from 'lucide-react';
import { validateBodyMetric } from '../lib/bodyMetricContract';
import { useToast } from '../hooks/useToast';

const STEPS = [
  { id: 'scale', label: 'Scale & Base', icon: Target },
  { id: 'measurements', label: 'Measurements', icon: RulerIcon },
  { id: 'face', label: 'Face', icon: Eye },
  { id: 'hair', label: 'Hair & Skin', icon: User },
  { id: 'anatomy', label: 'Anatomy', icon: User },
  { id: 'clothing', label: 'Clothing', icon: Shirt },
];

function RulerIcon(props) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
}

export default function AvatarCreationWizard({ onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const currentMetrics = use3DStore(s => s.cloneA?.metrics || {});
  const updateCurrentMetric = use3DStore(s => s.setCurrentMetric);
  const setWardrobe = use3DStore(s => s.setWardrobe);
  const setCameraPreset = use3DStore(s => s.setCameraPreset);
  const setViewMode = use3DStore(s => s.setViewMode);
  const wardrobe = use3DStore(s => s.wardrobeState);
  
  const toast = useToast();

  const handleNext = () => {
    // Validate current step before proceeding
    if (STEPS[currentStepIndex].id === 'scale') {
      if (!currentMetrics.height || currentMetrics.height < 100 || currentMetrics.height > 250) {
        toast.error('Please enter a valid height (100 - 250 cm) to establish scale.');
        return;
      }
    }
    
    if (currentStepIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentStepIndex + 1];
      setCurrentStepIndex(currentStepIndex + 1);
      
      // Auto-adjust camera view based on step
      if (nextStep.id === 'face') setCameraPreset('FRONT');
      if (nextStep.id === 'hair') setCameraPreset('BACK');
      if (nextStep.id === 'scale' || nextStep.id === 'measurements' || nextStep.id === 'clothing') setCameraPreset('FRONT');
    } else {
      if (onComplete) onComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleMetricChange = (key, value) => {
    updateCurrentMetric(key, Number(value) || value);
  };

  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="avatar-wizard fade-in glass-card" style={{
      position: 'absolute', top: 20, right: 20, bottom: 20, 
      width: '380px', zIndex: 100, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-elevated)', borderRadius: '16px', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <currentStep.icon size={20} className="text-accent" />
          {currentStep.label}
        </h2>
        <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
          {STEPS.map((step, idx) => (
            <div key={step.id} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: idx <= currentStepIndex ? 'var(--accent)' : 'var(--border-strong)',
              transition: 'background 0.3s ease'
            }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        
        {currentStep.id === 'scale' && (
          <div className="form-stack">
            <p className="text-secondary" style={{ marginBottom: '1rem' }}>
              Height establishes the foundational scale for your avatar. This determines physical units.
            </p>
            <label>
              <span className="card-title">Height (cm)</span>
              <input type="number" className="form-input" 
                value={currentMetrics.height || ''}
                onChange={e => handleMetricChange('height', e.target.value)}
                placeholder="e.g. 175"
              />
            </label>
            <label>
              <span className="card-title">Weight (kg)</span>
              <input type="number" className="form-input" 
                value={currentMetrics.weight || ''}
                onChange={e => handleMetricChange('weight', e.target.value)}
                placeholder="e.g. 70"
              />
            </label>
            <label>
              <span className="card-title">Biological Sex (Base Mesh)</span>
              <select className="form-input"
                value={currentMetrics.biologicalSex || 'neutral'}
                onChange={e => handleMetricChange('biologicalSex', e.target.value)}
              >
                <option value="neutral">Neutral Base</option>
                <option value="male">Male Base</option>
                <option value="female">Female Base</option>
              </select>
            </label>
          </div>
        )}

        {currentStep.id === 'measurements' && (
          <div className="form-stack">
            <p className="text-secondary" style={{ marginBottom: '1rem' }}>
              Enter exact measurements. The solver will perfectly align the 3D mesh.
            </p>
            {['chest', 'waist', 'hips', 'shoulders', 'neck', 'arms', 'thighs', 'calves'].map(metric => (
              <label key={metric}>
                <span className="card-title" style={{ textTransform: 'capitalize' }}>{metric} (cm)</span>
                <input type="number" className="form-input" 
                  value={currentMetrics[metric] || ''}
                  onChange={e => handleMetricChange(metric, e.target.value)}
                  placeholder={`Optional`}
                />
              </label>
            ))}
          </div>
        )}

        {currentStep.id === 'face' && (
          <div className="form-stack">
            <label>
              <span className="card-title">Eye Color</span>
              <input type="color" className="form-input" style={{ padding: 0, height: '40px' }}
                value={currentMetrics.eyeColor || '#6B3B20'}
                onChange={e => handleMetricChange('eyeColor', e.target.value)}
              />
            </label>
            <label>
              <span className="card-title">Face Roundness</span>
              <input type="range" min="0" max="1" step="0.05"
                value={currentMetrics.face_roundness || 0.5}
                onChange={e => handleMetricChange('face_roundness', e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </label>
            <label>
              <span className="card-title">Jaw Width</span>
              <input type="range" min="0" max="1" step="0.05"
                value={currentMetrics.jaw_width || 0.5}
                onChange={e => handleMetricChange('jaw_width', e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </label>
          </div>
        )}

        {currentStep.id === 'hair' && (
          <div className="form-stack">
            <label>
              <span className="card-title">Hair Style</span>
              <select className="form-input"
                value={currentMetrics.hairStyle || 'short'}
                onChange={e => handleMetricChange('hairStyle', e.target.value)}
              >
                <option value="bald">Bald</option>
                <option value="buzz">Buzz Cut</option>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </label>
            <label>
              <span className="card-title">Hair Color</span>
              <input type="color" className="form-input" style={{ padding: 0, height: '40px' }}
                value={currentMetrics.hairColor || '#2C1A0A'}
                onChange={e => handleMetricChange('hairColor', e.target.value)}
              />
            </label>
            <label>
              <span className="card-title">Skin Fitzpatrick Tone</span>
              <select className="form-input"
                value={currentMetrics.skinTone || 'III'}
                onChange={e => handleMetricChange('skinTone', e.target.value)}
              >
                <option value="I">Type I - Very Light</option>
                <option value="II">Type II - Light</option>
                <option value="III">Type III - Medium</option>
                <option value="IV">Type IV - Olive</option>
                <option value="V">Type V - Brown</option>
                <option value="VI">Type VI - Dark</option>
              </select>
            </label>
          </div>
        )}

        {currentStep.id === 'anatomy' && (
          <div className="form-stack">
            <p className="text-secondary" style={{ marginBottom: '1rem' }}>
              Advanced anatomy controls for proportional modifications.
            </p>
            {['torsoLength', 'shoulder_slope', 'clavicle_width', 'pelvis_width', 'legLength'].map(morph => (
              <label key={morph}>
                <span className="card-title" style={{ textTransform: 'capitalize' }}>{morph.replace('_', ' ')}</span>
                <input type="range" min="0" max="1" step="0.05"
                  value={currentMetrics[morph] || 0.5}
                  onChange={e => handleMetricChange(morph, e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </label>
            ))}
          </div>
        )}

        {currentStep.id === 'clothing' && (
          <div className="form-stack">
            <p className="text-secondary" style={{ marginBottom: '1rem' }}>
              Select default wardrobe.
            </p>
            <label>
              <span className="card-title">Wardrobe</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['GYM', 'CASUAL', 'UNDERWEAR', 'ANATOMICAL'].map(w => (
                  <button key={w} 
                    className={`btn-${wardrobe === w ? 'primary' : 'ghost'}`}
                    onClick={() => setWardrobe(w)}
                    style={{ flex: 1, minWidth: '40%' }}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </label>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn-ghost" onClick={handleBack} disabled={currentStepIndex === 0} style={{ opacity: currentStepIndex === 0 ? 0.3 : 1 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <button className="btn-primary" onClick={handleNext}>
          {currentStepIndex === STEPS.length - 1 ? 'Finish Setup' : 'Next Step'} 
          {currentStepIndex === STEPS.length - 1 ? <Check size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
}
