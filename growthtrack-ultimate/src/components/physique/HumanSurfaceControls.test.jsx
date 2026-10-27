import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import DigitPoseControls from './DigitPoseControls';
import SurfaceDetailControls from './SurfaceDetailControls';
afterEach(cleanup);
it('edits hand/toe records and preserves the other side',()=>{
  const onChange=vi.fn();render(<DigitPoseControls digits={{rightHand:{shape:'point',strength:.7}}} onChange={onChange} readPose={()=>({digitGroups:['leftHand','rightHand','leftFoot','rightFoot']})}/>);
  fireEvent.change(screen.getByRole('combobox',{name:'Left hand shape'}),{target:{value:'fist'}});
  expect(onChange).toHaveBeenLastCalledWith({rightHand:{shape:'point',strength:.7},leftHand:{shape:'fist',strength:1}});
  fireEvent.change(screen.getByRole('slider',{name:'Right toes curl'}),{target:{value:'.4'}});
  expect(onChange).toHaveBeenLastCalledWith({rightHand:{shape:'point',strength:.7},rightFoot:{curl:.4}});
});
it('disables unsupported rigs and controls saved pore relief with its JSON default',()=>{
  const onChange=vi.fn();const {unmount}=render(<DigitPoseControls onChange={onChange} readPose={()=>({rigJoints:79,digitGroups:[]})}/>);
  expect(screen.getByRole('combobox',{name:'Left hand shape'}).matches(':disabled')).toBe(true);unmount();
  render(<SurfaceDetailControls metrics={{skinMicroDetail:.8}} onChange={onChange}/>);
  fireEvent.change(screen.getByRole('slider',{name:'Pore detail'}),{target:{value:'.2'}});expect(onChange).toHaveBeenLastCalledWith('skinMicroDetail',.2);
  fireEvent.click(screen.getByRole('button',{name:'Reset surface detail'}));expect(onChange).toHaveBeenLastCalledWith('skinMicroDetail',.45);
});
it('edits only the saved realism percentage and explains its visual meaning',()=>{
  const onChange=vi.fn();const {rerender}=render(<SurfaceDetailControls metrics={{height:180,skinMicroDetail:.8}} onChange={onChange}/>);
  expect(screen.getByRole('slider',{name:'Human appearance detail'}).value).toBe('100');
  expect(screen.getByText(/not a human likeness or medical accuracy score/)).toBeTruthy();
  fireEvent.change(screen.getByRole('slider',{name:'Human appearance detail'}),{target:{value:'35'}});
  expect(onChange).toHaveBeenCalledExactlyOnceWith('humanRealismPercent',35);
  rerender(<SurfaceDetailControls metrics={{humanRealismPercent:35,height:180,skinMicroDetail:.8}} onChange={onChange}/>);
  expect(screen.getByRole('slider',{name:'Human appearance detail'}).value).toBe('35');
  expect(screen.getByRole('slider',{name:'Pore detail'}).value).toBe('0.8');
});
