import React from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import AnimationPanel from './AnimationPanel';
import use3DStore from '../../store/use3DStore';
beforeEach(()=>use3DStore.setState({viewMode:'SOLO',animationState:{animationId:'standing',playing:false,speed:1},avatarWorkspace:{...use3DStore.getState().avatarWorkspace,inspectorOpen:true,inspectorSection:'pose',avatarContext:'current',poseStudio:{current:{enabled:false},goal:{enabled:false}}},rendererQualityTelemetry:{...use3DStore.getState().rendererQualityTelemetry,reducedMotion:false}}));
afterEach(cleanup);
it('separates static presets and motion, and waits for explicit playback',()=>{
  const onSelect=vi.fn();render(<AnimationPanel inline onSelect={onSelect}/>);
  fireEvent.click(screen.getByRole('button',{name:'Squat',exact:true}));
  expect(use3DStore.getState().animationState).toMatchObject({animationId:'squat',playing:false});
  expect(screen.queryByRole('button',{name:'Play animation'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Walking',exact:true}));
  expect(use3DStore.getState().animationState.playing).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'Play animation'}));
  expect(use3DStore.getState().animationState.playing).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Pause animation'}));
  expect(use3DStore.getState().animationState.playing).toBe(false);
});
it('keeps technical poses optional and respects reduced motion',()=>{
  use3DStore.setState({animationState:{animationId:'running',playing:false,speed:1},rendererQualityTelemetry:{reducedMotion:true}});
  render(<AnimationPanel inline/>);
  expect(screen.getByRole('button',{name:'T-Pose'}).closest('details').open).toBe(false);
  fireEvent.click(screen.getByText('Technical poses'));
  expect(screen.getByRole('button',{name:'T-Pose'})).toBeVisible();
  expect(screen.getByRole('button',{name:'Play animation'})).toBeDisabled();
});
