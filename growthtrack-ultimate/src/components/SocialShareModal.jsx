import React, {useMemo, useState} from 'react';
import {X, Download, Share2, ShieldCheck} from 'lucide-react';
import {Z_INDEX} from '../constants';
import useDialogFocus from '../hooks/useDialogFocus';
import {chooseShareMethod, pngFileFromDataUrl} from '../lib/avatarCapturePolicy';

export default function SocialShareModal({onClose, imageSrc}) {
  const dialogRef = useDialogFocus(true, onClose);
  const [status, setStatus] = useState('');
  const [sharing, setSharing] = useState(false);
  const file = useMemo(() => {
    try {return pngFileFromDataUrl(imageSrc);} catch {return null;}
  }, [imageSrc]);
  const download = () => {
    if (!file) return;
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = file.name;
    link.click();
  };
  const share = async () => {
    if (!file || sharing) return;
    setSharing(true); setStatus('');
    try {
      const method = chooseShareMethod(navigator, file);
      if (method === 'native-files') {
        await navigator.share({title:'My avatar', files:[file]});
        setStatus('Image shared.');
      } else if (method === 'clipboard-image') {
        await navigator.clipboard.write([new ClipboardItem({'image/png':file})]);
        setStatus('Image copied. Paste it into the app you want to share with.');
      } else {
        download(); setStatus('Image saved. Attach it in the app you want to share with.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        download(); setStatus('Sharing is unavailable. The image was saved so you can attach it yourself.');
      }
    } finally {setSharing(false);}
  };
  return <div className="avatar-share-overlay" style={{zIndex:Z_INDEX.MODAL_OVERLAY}} onClick={onClose}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="avatar-share-title" tabIndex={-1} className="avatar-share-dialog" onClick={event => event.stopPropagation()}>
      <div className="avatar-share-heading"><h3 id="avatar-share-title">Share your avatar</h3><button type="button" className="chamber-pill" aria-label="Close sharing" onClick={onClose}><X size={18}/></button></div>
      {imageSrc && <img className="avatar-share-preview" src={imageSrc} alt="Protected avatar view ready to share"/>}
      <p><ShieldCheck size={15}/> Private anatomy is covered. Your measurements are excluded.</p>
      <div className="avatar-share-actions">
        <button type="button" className="chamber-pill" disabled={!file || sharing} onClick={download}><Download size={16}/> Save image</button>
        <button type="button" className="chamber-pill chamber-pill--primary" disabled={!file || sharing} onClick={share}><Share2 size={16}/>{sharing ? 'Sharing…' : 'Share image'}</button>
      </div>
      <p role="status">{file ? status : 'The image could not be prepared. Close this window and try exporting again.'}</p>
    </div>
  </div>;
}
