import { createContext, useContext } from 'react';
import useStore from '../store/useStore';

export const AvatarRecordContext = createContext(null);
const EMPTY = Object.freeze({});
const NO_FLUSH = (_flush) => () => {};

// The owner remains the authentication/formatting identity. Only avatar data
// is scoped; creating a friend never replaces the signed-in account.
export default function useAvatarRecord() {
  const scoped = useContext(AvatarRecordContext);
  const user = useStore(state => state.user);
  const bodyProfile = useStore(state => state.bodyProfile);
  const physiqueTargets = useStore(state => state.physiqueTargets);
  const metricLogs = useStore(state => state.metric_logs);
  const updateBodyProfile = useStore(state => state.updateBodyProfile);
  const updatePhysiqueTargets = useStore(state => state.updatePhysiqueTargets);
  const saveMetricLog = useStore(state => state.saveMetricLog);
  const updateUser = useStore(state => state.updateUser);
  return scoped || { personId: 'self', name: 'My avatar', legacyUser: user || EMPTY,
    dateOfBirth: user?.dob ?? user?.dateOfBirth ?? null,
    bodyProfile, physiqueTargets, metricLogs, updateBodyProfile, updatePhysiqueTargets, saveMetricLog,
    updateDateOfBirth: value => updateUser({ dob: value }), registerFlush: NO_FLUSH };
}
