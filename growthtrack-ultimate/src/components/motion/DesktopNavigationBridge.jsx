import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { featurePath } from '../../config/featureRegistry';
export default function DesktopNavigationBridge() {
  const navigate = useNavigate();
  useEffect(() => window.growthTrackDesktop?.onOpenFeature?.(feature => { if (['notes', 'calendar', 'current', 'ai'].includes(feature)) navigate(featurePath(feature)); }), [navigate]);
  return null;
}
