import { act,cleanup,renderHook } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import useWardrobePreferences from './useWardrobePreferences';
import useStore from '../store/useStore';
import use3DStore from '../store/use3DStore';
import { apiRequest } from '../lib/apiClient';

vi.mock('../lib/apiClient',()=>({apiRequest:vi.fn()}));
vi.mock('../lib/logger',()=>({logCRUD:vi.fn().mockResolvedValue(undefined)}));
beforeEach(()=> {
  vi.useFakeTimers();vi.mocked(apiRequest).mockReset().mockResolvedValue({id:'fixture-targets'});
  useStore.getState().resetSessionData();useStore.setState({user:{id:'wardrobe-owner'},physiqueTargets:{anatomyV2:{schemaVersion:2}}});
});
afterEach(()=>{cleanup();vi.useRealTimers();});
const tick=()=>act(async()=>{await vi.advanceTimersByTimeAsync(400);});
it('merges rapid style, fit and color edits with the latest anatomy records',async()=> {
  const {result}=renderHook(()=>useWardrobePreferences());
  act(()=>{result.current.change({preset:'GYM'});result.current.change({options:{variant:'training',fit:'relaxed',topColor:'#556677'}});});
  act(()=>useStore.setState({physiqueTargets:{anatomyV2:{schemaVersion:2,current:{note:'latest'}}}}));
  await tick();
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(useStore.getState().physiqueTargets).toMatchObject({anatomyV2:{current:{note:'latest'}},wardrobePreferences:{preset:'GYM',outfits:{GYM:{variant:'training',fit:'relaxed',topColor:'#556677'}}}});
  expect(result.current.status).toBe('saved');
});
it('never restores a saved reveal and cancels edits on account changes',async()=> {
  useStore.setState({physiqueTargets:{wardrobePreferences:{preset:'ANATOMICAL'}}});
  const {result}=renderHook(()=>useWardrobePreferences());
  expect(use3DStore.getState().wardrobeState).toBe('UNDERWEAR');
  act(()=>result.current.change({preset:'CASUAL'}));
  act(()=>useStore.setState({user:{id:'other-owner'},physiqueTargets:{}}));
  await tick();expect(apiRequest).not.toHaveBeenCalled();expect(use3DStore.getState().wardrobeState).toBe('UNDERWEAR');
});
it('keeps the selected preview on save failure and flushes pending changes on leave',async()=> {
  vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline'));
  const {result,unmount}=renderHook(()=>useWardrobePreferences());
  act(()=>result.current.change({preset:'CASUAL'}));await tick();
  expect(result.current.status).toBe('error');expect(use3DStore.getState().wardrobeState).toBe('CASUAL');
  act(()=>result.current.change({options:{fit:'relaxed'}}));unmount();await tick();
  expect(useStore.getState().physiqueTargets.wardrobePreferences.outfits.CASUAL.fit).toBe('relaxed');
});
