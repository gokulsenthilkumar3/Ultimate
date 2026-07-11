import { Z_INDEX } from '../constants';
import React, { useState } from 'react';
import { ArrowRight, Check, Activity, Target, User as UserIcon, AlertCircle } from 'lucide-react';
import useStore, { selectSetUser, selectSetOnboardingComplete } from '../store/useStore';
import { apiSync } from '../store/useStore';

export default function OnboardingWizard() {
  const setUser = useStore(selectSetUser);
  const setOnboardingComplete = useStore(selectSetOnboardingComplete);

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    gender: 'male',
    age: 25,
    height: 175,
    weight: 70,
    goal: 'general_health'
  });

  const validate = (currentStep) => {
    const errs = {};
    if (currentStep === 1) {
      if (!formData.name.trim()) errs.name = 'Name is required.';
    }
    if (currentStep === 2) {
      if (!formData.age || formData.age < 13 || formData.age > 120) errs.age = 'Enter a valid age (13–120).';
      if (!formData.height || formData.height < 100 || formData.height > 250) errs.height = 'Enter a valid height in cm (100–250).';
      if (!formData.weight || formData.weight < 30 || formData.weight > 300) errs.weight = 'Enter a valid weight in kg (30–300).';
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validate(step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep(s => s - 1);
  };

  const handleComplete = async () => {
    const newUser = {
      name: formData.name.trim() || 'Athlete',
      gender: formData.gender,
      age: formData.age,
      height: formData.height,
      weight: formData.weight,
      metrics: { height: formData.height, weight: formData.weight },
      goals: { primary: formData.goal },
    };
    // Persist to store and API backend
    setUser(newUser);
    apiSync('/user', 'POST', newUser);
    setOnboardingComplete(true);
  };

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  };

  const FieldError = ({ field }) => errors[field] ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontSize: '0.78rem', marginTop: '4px' }}>
      <AlertCircle size={12} /> {errors[field]}
    </div>
  ) : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: Z_INDEX.WIZARD,
      background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="mesh-bg" />

      <div className="glass-card fade-in" style={{
        maxWidth: '500px', width: '100%',
        display: 'flex', flexDirection: 'column', gap: '2rem'
      }}>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '8px' }} role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: step >= i ? 'var(--accent)' : 'var(--border-strong)',
              transition: 'background 0.3s ease'
            }} />
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ padding: '8px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '12px' }}>
                  <UserIcon size={24} />
                </div>
                <h2 className="text-display" style={{ fontSize: '1.8rem', margin: 0 }}>Welcome to Ultimate</h2>
              </div>
              <p className="text-secondary">Let's set up your digital twin profile.</p>
            </div>

            <div className="form-stack">
              <label>
                <span className="card-title">What should we call you?</span>
                <input
                  type="text" className="form-input"
                  placeholder="Your Name"
                  value={formData.name} onChange={e => updateForm('name', e.target.value)}
                  autoFocus
                  aria-required="true"
                  aria-invalid={!!errors.name}
                />
                <FieldError field="name" />
              </label>

              <label>
                <span className="card-title">Biological Sex</span>
                <select className="form-input" value={formData.gender} onChange={e => updateForm('gender', e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
            </div>

            <button className="btn-primary" onClick={handleNext} style={{ marginTop: '1rem', alignSelf: 'flex-end' }}>
              Next Step <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Metrics */}
        {step === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ padding: '8px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '12px' }}>
                  <Activity size={24} />
                </div>
                <h2 className="text-display" style={{ fontSize: '1.8rem', margin: 0 }}>Starting Metrics</h2>
              </div>
              <p className="text-secondary">These form the baseline of your avatar.</p>
            </div>

            <div className="form-stack">
              <label>
                <span className="card-title">Age (years)</span>
                <input type="number" className="form-input" value={formData.age}
                  min={13} max={120}
                  onChange={e => updateForm('age', Number(e.target.value))}
                  aria-invalid={!!errors.age}
                />
                <FieldError field="age" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label>
                  <span className="card-title">Height (cm)</span>
                  <input type="number" className="form-input" value={formData.height}
                    min={100} max={250}
                    onChange={e => updateForm('height', Number(e.target.value))}
                    aria-invalid={!!errors.height}
                  />
                  <FieldError field="height" />
                </label>
                <label>
                  <span className="card-title">Weight (kg)</span>
                  <input type="number" className="form-input" value={formData.weight}
                    min={30} max={300}
                    onChange={e => updateForm('weight', Number(e.target.value))}
                    aria-invalid={!!errors.weight}
                  />
                  <FieldError field="weight" />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button className="btn-ghost" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleNext}>Next Step <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Goals */}
        {step === 3 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ padding: '8px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: '12px' }}>
                  <Target size={24} />
                </div>
                <h2 className="text-display" style={{ fontSize: '1.8rem', margin: 0 }}>Primary Goal</h2>
              </div>
              <p className="text-secondary">What are you focusing on right now?</p>
            </div>

            <div className="form-stack" role="radiogroup" aria-label="Primary goal selection">
              {[
                { id: 'build_muscle', label: 'Build Muscle', desc: 'Focus on hypertrophy and strength' },
                { id: 'lose_fat', label: 'Lose Fat', desc: 'Caloric deficit and conditioning' },
                { id: 'improve_fitness', label: 'Improve Fitness', desc: 'Cardio, endurance, and agility' },
                { id: 'general_health', label: 'General Health', desc: 'Balanced lifestyle and longevity' }
              ].map(g => (
                <div
                  key={g.id}
                  role="radio"
                  aria-checked={formData.goal === g.id}
                  tabIndex={0}
                  onClick={() => updateForm('goal', g.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') updateForm('goal', g.id); }}
                  style={{
                    padding: '16px', borderRadius: '12px',
                    border: `1px solid ${formData.goal === g.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: formData.goal === g.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: '12px'
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: `2px solid ${formData.goal === g.id ? 'var(--accent)' : 'var(--text-3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {formData.goal === g.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)' }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: formData.goal === g.id ? 'var(--text-1)' : 'var(--text-2)' }}>{g.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{g.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button className="btn-ghost" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleComplete}>Finish Setup <Check size={16} /></button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
