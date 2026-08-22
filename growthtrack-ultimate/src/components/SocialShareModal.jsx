import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { X, Download, Share2 } from 'lucide-react';
import useStore from '../store/useStore';
import { Z_INDEX } from '../constants';

export default function SocialShareModal({ onClose, imageSrc, score }) {
  const user = useStore(state => state.user);
  const captureRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const referralLink = `${window.location.origin}/login?ref=${user?.referralCode}`;

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(captureRef.current, { backgroundColor: '#09090b', scale: 2 });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `ultimate_avatar_${user?.referralCode}.png`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const shareText = `I'm leveling up my life with Ultimate. My current score is ${score || 0}! Join me: ${referralLink}`;

  const handleShare = (platform) => {
    const encodedText = encodeURIComponent(shareText);
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
    }
    // Web Share API fallback
    if (platform === 'web' && navigator.share) {
      navigator.share({ title: 'Ultimate', text: shareText, url: referralLink }).catch(console.error);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: Z_INDEX.MODAL_OVERLAY,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="glass-card fade-in" style={{
        width: '100%', maxWidth: '400px', background: 'var(--bg-elevated)',
        padding: '2rem', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
          width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', cursor: 'pointer'
        }}>
          <X size={16} />
        </button>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center' }}>Share Your Avatar</h3>

        <div 
          ref={captureRef}
          style={{
            position: 'relative', width: '100%', aspectRatio: '4/5',
            background: 'var(--bg-base)', borderRadius: '24px', overflow: 'hidden',
            border: '2px solid var(--border)', marginBottom: '1.5rem',
            display: 'flex', flexDirection: 'column'
          }}
        >
          {/* Main Image */}
          {imageSrc ? (
            <img src={imageSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
              No Avatar generated yet
            </div>
          )}

          {/* Overlay elements */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
            padding: '2rem 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'
          }}>
            <div>
              <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, margin: '0 0 4px 0' }}>{user?.user_metadata?.full_name || 'Ultimate User'}</p>
              <p style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Lvl. {Math.floor((score || 0)/100) + 1} | Score {score || 0}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <img src="/logo.svg" alt="Ultimate" style={{ width: '24px', height: '24px', marginBottom: '4px', filter: 'invert(1)' }} onError={(e) => e.target.style.display = 'none'} />
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', margin: 0 }}>Join me at<br />ultimate.app</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button 
            onClick={handleDownload}
            disabled={generating || !imageSrc}
            style={{
              padding: '12px', borderRadius: '12px', background: 'var(--accent)',
              color: '#fff', border: 'none', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: generating || !imageSrc ? 'not-allowed' : 'pointer', opacity: generating || !imageSrc ? 0.7 : 1
            }}
          >
            <Download size={16} /> {generating ? 'Saving...' : 'Save'}
          </button>
          
          <button 
            onClick={() => handleShare('web')}
            style={{
              padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)',
              color: '#fff', border: '1px solid var(--border)', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Share2 size={16} /> Share
          </button>
        </div>
        
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button onClick={() => handleShare('twitter')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }} className="hover-text-1">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
            </svg> Post to X
          </button>
        </div>
      </div>
    </div>
  );
}
