import React, { useState } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '../lib/analytics';
import Button from './ui/Button';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(() => getAnalyticsConsent() == null);
  if (!visible) return null;
  const choose = granted => { setAnalyticsConsent(granted); setVisible(false); };
  return <aside className="consent-banner" role="dialog" aria-label="Privacy choices">
    <div><strong>Privacy choices</strong><p>GrowthTrack uses essential storage to keep you signed in. Optional analytics help improve the product and stay off until you choose.</p></div>
    <div className="consent-banner__actions"><Button variant="ghost" onClick={() => choose(false)}>Keep private</Button><Button onClick={() => choose(true)}>Allow analytics</Button></div>
  </aside>;
}
