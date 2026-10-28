import React, { lazy, Suspense, useEffect } from 'react';
import { Empty } from './components';
import { resolveScreenKey, screenLoaders } from './screenRegistry';

const SCREENS = Object.fromEntries(Object.entries(screenLoaders).map(([key, load]) => [key, lazy(load)]));

export class ScreenBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch() { this.props.onError?.(); }
  componentDidUpdate(previous) {
    if (this.state.error && this.props.resetKey !== previous.resetKey) this.setState({ error: null });
  }
  render() {
    if (this.state.error) return <Empty error title="This page couldn’t be opened" description="Reload the preview to try again. Your saved review notes remain in this browser." actionLabel="Reload preview" onReset={() => window.location.reload()} />;
    return this.props.children;
  }
}
function ReadyScreen({ Component, onReady, variantKey, ...props }) {
  useEffect(() => { onReady?.(variantKey); }, [onReady, variantKey]);
  return <Component {...props} />;
}
export default function Screen(props) {
  const Component = SCREENS[resolveScreenKey(props.page)];
  return <ScreenBoundary key={props.page.id} resetKey={props.variantKey} onError={() => props.onReady?.('')}><Suspense fallback={<Empty loading />}><ReadyScreen Component={Component} {...props} /></Suspense></ScreenBoundary>;
}
