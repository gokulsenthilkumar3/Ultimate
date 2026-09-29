import { useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Reset transient overlays when the route or responsive mode changes. No preference writes. */
export default function useNavigationOverlay(mode) {
  const location = useLocation();
  const context = `${mode}:${location.key}:${location.pathname}:${location.search}:${location.hash}`;
  const [state, setState] = useState({ context, open: false });
  // A guarded render adjustment closes before paint and avoids a reset effect.
  if (state.context !== context) setState({ context, open: false });
  return [state.context === context && state.open, open => setState({ context, open })];
}
