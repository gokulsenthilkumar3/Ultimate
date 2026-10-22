import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import PoseStudioControls from './PoseStudioControls';
import CameraBookmarkControls from './CameraBookmarkControls';
afterEach(cleanup);
it('initializes reach from the rendered endpoint and preserves other joint edits',()=>{
  const onChange=vi.fn();
  render(<PoseStudioControls value={{enabled:true,joints:{head:[0,20,0]},targets:{}}} onChange={onChange} readPose={()=>({limbs:{leftWrist:{normalized:[.4,-.7,.2]}}})} saveStatus="saved"/>);
  fireEvent.click(screen.getByRole('checkbox',{name:'Use reach target'}));
  expect(onChange).toHaveBeenCalledWith({enabled:true,joints:{head:[0,20,0]},targets:{leftWrist:[.4,-.7,.2]}});
});
it('retains the draft during save failure and exposes an explicit retry',()=>{
  const onChange=vi.fn();
  render(<PoseStudioControls value={{enabled:true,joints:{head:[0,20,0]}}} onChange={onChange} readPose={()=>null} saveStatus="error"/>);
  fireEvent.click(screen.getByRole('button',{name:'Retry pose save'}));
  expect(onChange).toHaveBeenCalledWith({enabled:true,joints:{head:[0,20,0]},targets:{}});
  fireEvent.click(screen.getByRole('checkbox',{name:'Use reach target'}));
  expect(screen.getByText('Wait for the interactive model to finish loading.')).toBeTruthy();
  expect(onChange).toHaveBeenCalledTimes(1);
});
it('disables pose edits in comparison and keeps the reset local to this pose',()=>{
  const onChange=vi.fn();const props={value:{enabled:true,joints:{head:[0,20,0]}},onChange,readPose:()=>null};
  const {rerender}=render(<PoseStudioControls {...props} available={false}/>);
  expect(screen.getByRole('checkbox',{name:'Use saved pose'}).matches(':disabled')).toBe(true);
  rerender(<PoseStudioControls {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Reset this pose'}));
  expect(onChange).toHaveBeenCalledWith({enabled:false,joints:{},targets:{}});
});
it('does not report an old endpoint as a newly applied target while the preview is paused',()=>{
  render(<PoseStudioControls value={{enabled:true,joints:{},targets:{leftWrist:[.2,-.6,.3]}}} onChange={()=>{}}
    readPose={()=>({targets:{leftWrist:[.4,-.7,.2]},limbs:{leftWrist:{reached:true,error:0,reach:1}}})}/>);
  fireEvent.click(screen.getByRole('button',{name:'Check reach'}));
  expect(screen.getByText('Bring the model into view to update reach, then check again.')).toBeTruthy();
});
it('saves the actual camera, and can rename, apply and remove a saved view',()=>{
  const view={azimuth:.6,polar:1.4,distanceRatio:2,targetOffset:[.1,.5,0]},onChange=vi.fn(),onApply=vi.fn();
  const props={value:[],onChange,onApply,readView:()=>view};
  const {rerender}=render(<CameraBookmarkControls {...props}/>);
  fireEvent.change(screen.getByRole('textbox',{name:'New view name'}),{target:{value:' Oblique '}});
  fireEvent.click(screen.getByRole('button',{name:'Save current view'}));
  const saved=onChange.mock.calls[0][0];expect(saved[0]).toMatchObject({name:'Oblique',view});
  rerender(<CameraBookmarkControls {...props} value={saved}/>);
  fireEvent.click(screen.getByRole('button',{name:'Open Oblique'}));expect(onApply).toHaveBeenCalledWith(view);
  fireEvent.change(screen.getByRole('textbox',{name:'Name for Oblique'}),{target:{value:'Profile'}});
  fireEvent.click(screen.getByRole('button',{name:'Rename Oblique'}));expect(onChange.mock.lastCall[0][0].name).toBe('Profile');
  fireEvent.click(screen.getByRole('button',{name:'Remove Oblique'}));expect(onChange).toHaveBeenLastCalledWith([]);
});
