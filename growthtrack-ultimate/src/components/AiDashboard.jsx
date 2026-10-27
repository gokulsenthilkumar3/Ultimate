import React from 'react';
import useStore from '../store/useStore';
import AgentsWorkspace from './agents/AgentsWorkspace';
import './AiDashboard.css';

export default function AiDashboard() {
  const state = useStore();
  return <AgentsWorkspace key={String(state.user?.id || 'signed-out') + ':' + state._sessionVersion} state={state} />;
}
