import { expect, it } from 'vitest';
import use3DStore from '../store/use3DStore';

it('maps recorded posture, preserves an explicit zero goal, and clears it when switching to a blank person', () => {
  const store=use3DStore.getState();
  store.setCurrentMetrics({height:175,headTiltAngle:20,pelvicTilt:10});
  store.setGoalMetrics({headTiltAngle:0});
  expect(use3DStore.getState().cloneA.posture).toMatchObject({headTiltAngle:20,pelvicTilt:10});
  expect(use3DStore.getState().cloneB.posture).toMatchObject({headTiltAngle:0,pelvicTilt:10});
  store.setCurrentMetric('pelvicTilt',15);
  expect(use3DStore.getState().cloneB.posture.pelvicTilt).toBe(15);
  store.setGoalMetric('pelvicTilt',0);
  expect(use3DStore.getState().cloneB.posture.pelvicTilt).toBe(0);
  store.setCurrentMetrics({}); store.setGoalMetrics({});
  expect(use3DStore.getState().cloneA.posture).toEqual({headTiltAngle:0,pelvicTilt:0,shoulderRounding:0});
  expect(use3DStore.getState().cloneB.posture).toEqual(use3DStore.getState().cloneA.posture);
});
