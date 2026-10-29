import React from 'react';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import AgentsWorkspace from './agents/AgentsWorkspace';
import './AiDashboard.css';

export default function AiDashboard() {
  const state = useStore(useShallow(current => ({
    user: current.user, _sessionVersion: current._sessionVersion, _dataRevision: current._dataRevision,
    isLoading: current.isLoading, initialLoadError: current.initialLoadError, appConfig: current.appConfig,
    goals: current.goals, habits: current.habits, metric_logs: current.metric_logs, sleep_logs: current.sleep_logs,
    finance: current.finance, notes: current.notes, timesheetEntries: current.timesheetEntries, documents: current.documents,
    entertainment: current.entertainment, nutrition_logs: current.nutrition_logs, workouts: current.workouts,
    moodLogs: current.moodLogs, vitalsLogs: current.vitalsLogs, medications: current.medications,
    subscriptions: current.subscriptions, portfolio: current.portfolio, shopping: current.shopping,
  })));
  return <AgentsWorkspace key={String(state.user?.id || 'signed-out') + ':' + state._sessionVersion} state={state} />;
}
