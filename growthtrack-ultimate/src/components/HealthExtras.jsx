import React, { useState } from 'react';
import { Eye, Ear, Wind, Fingerprint, Brain, Activity, ClipboardList, Target, Smile, Heart } from 'lucide-react';

const HealthExtras = () => {
  const [senses, setSenses] = useState({
    vision: { level: 85, note: 'Slight strain after long work', exercises: ['Palming', 'Focus Shifting'] },
    hearing: { level: 90, note: 'Normal range', exercises: ['Sound Localization'] },
    smell: { level: 95, note: 'Highly sensitive', exercises: ['Scent Identification'] },
    taste: { level: 90, note: 'Clear palate', exercises: ['Mindful Eating'] },
    touch: { level: 88, note: 'Responsive', exercises: ['Texture Discrimination'] }
  });

  const [lifestyle, setLifestyle] = useState({
    posture: 'Good',
    diets: ['Keto-friendly', 'Intermittent Fasting'],
    hobbies: ['Chess', 'Guitar', 'Photography'],
    broncoTest: 'Level 12.4'
  });

  const [gutHealth, setGutHealth] = useState({ score: 78, note: 'Better after probiotics' });
  const [skinHealth, setSkinHealth] = useState({ score: 82, note: 'Hydrated' });
  const [hairHealth, setHairHealth] = useState({ score: 85, note: 'Normal volume' });

  const getSensesIcon = (sense) => {
    switch(sense) {
      case 'vision': return <Eye size={20} color="#3b82f6" />;
      case 'hearing': return <Ear size={20} color="#8b5cf6" />;
      case 'smell': return <Wind size={20} color="#10b981" />;
      case 'taste': return <Activity size={20} color="#f59e0b" />;
      case 'touch': return <Fingerprint size={20} color="#ef4444" />;
      default: return null;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Health+ & Extras</h2>
        <p style={{ color: '#94a3b8' }}>Advanced health metrics, 5 senses improvement, and lifestyle tracking</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* 5 Senses Section */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Brain size={20} /> 5 Senses Status
          </h3>
          <div style={{ display: 'grid', gap: '15px' }}>
            {Object.entries(senses).map(([key, data]) => (
              <div key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', pb: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize' }}>
                    {getSensesIcon(key)}
                    <span style={{ fontWeight: '600' }}>{key}</span>
                  </div>
                  <span style={{ fontSize: '14px', color: '#10b981' }}>{data.level}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', mb: '5px' }}>
                  <div style={{ width: `${data.level}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)', borderRadius: '3px' }} />
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{data.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Specialized Health */}
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Heart size={20} /> Specialized Health
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Gut</p>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{gutHealth.score}%</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Skin</p>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{skinHealth.score}%</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Hair</p>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>{hairHealth.score}%</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={20} /> Performance & Vitals
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', mb: '10px' }}>
              <span>Bronco Test Score:</span>
              <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{lifestyle.broncoTest}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Posture Status:</span>
              <span style={{ fontWeight: 'bold', color: '#10b981' }}>{lifestyle.posture}</span>
            </div>
          </div>
        </div>

        {/* Lifestyle & Hobbies */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Smile size={20} /> Lifestyle & Hobbies
          </h3>
          <div style={{ mb: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ClipboardList size={14} /> Active Diets
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lifestyle.diets.map(diet => (
                <span key={diet} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 12px', borderRadius: '15px', fontSize: '12px' }}>{diet}</span>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Target size={14} /> Hobby Tracker
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lifestyle.hobbies.map(hobby => (
                <span key={hobby} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '4px 12px', borderRadius: '15px', fontSize: '12px' }}>{hobby}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthExtras;
