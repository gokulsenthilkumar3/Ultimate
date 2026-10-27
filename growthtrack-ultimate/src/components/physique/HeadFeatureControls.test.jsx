import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import HeadFeatureControls from './HeadFeatureControls';
import LikenessControls from './LikenessControls';

afterEach(cleanup);
const diagnostics={health:'healthy',hasScene:true,hasBodyMesh:true,morphTargetCount:70,missingMorphTargets:[]};

it('groups supported shapes and edits only the selected legacy channel with unitless output',()=>{
  const onChange=vi.fn();
  render(<HeadFeatureControls diagnostics={diagnostics} overrides={{nose_bridge_width:.45}} onChange={onChange}/>);
  expect(screen.getAllByRole('group')).toHaveLength(6);
  const nose=within(screen.getByRole('group',{name:'Nose',exact:true}));
  expect(nose.getByRole('slider',{name:'Nose Bridge'}).getAttribute('aria-valuetext')).toBe('0.45 shape strength');
  fireEvent.change(nose.getByRole('slider',{name:'Nose Bridge'}),{target:{value:'.67'}});
  expect(onChange).toHaveBeenCalledExactlyOnceWith({nose_bridge_width:.67});
  expect(screen.getByText(/not measurements or a likeness score/)).toBeTruthy();
});

it('keeps unavailable saved values visible and prevents edits or a reset that erases them',()=>{
  const onReset=vi.fn();
  const {rerender}=render(<HeadFeatureControls overrides={{nose_bridge_width:.72}} diagnostics={null} onChange={vi.fn()} onReset={onReset}/>);
  expect(screen.getByRole('slider',{name:'Nose Bridge'}).matches(':disabled')).toBe(true);
  expect(screen.getByRole('slider',{name:'Nose Bridge'}).value).toBe('0.72');
  rerender(<HeadFeatureControls overrides={{nose_bridge_width:.72}} diagnostics={{...diagnostics,missingMorphTargets:['nose_bridge_width']}} onChange={vi.fn()} onReset={onReset}/>);
  expect(screen.getByRole('button',{name:'Use measurements: Nose'}).matches(':disabled')).toBe(true);
  expect(onReset).not.toHaveBeenCalled();
});

it('searches aliases and resets the complete editable region even when the search narrows it',()=>{
  const onReset=vi.fn();
  render(<HeadFeatureControls overrides={{nose_bridge_width:.72,nose_tip_size:.6,jaw_width:.4,smile:.8}} diagnostics={diagnostics} onChange={vi.fn()} onReset={onReset}/>);
  fireEvent.change(screen.getByRole('searchbox',{name:'Find a face feature'}),{target:{value:'nasal bridge'}});
  expect(screen.getAllByRole('slider')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:'Use measurements: Nose'}));
  expect(onReset).toHaveBeenCalledExactlyOnceWith(['nose_bridge_width','nose_tip_size','nose_length']);
  fireEvent.change(screen.getByRole('searchbox',{name:'Find a face feature'}),{target:{value:'no such structure'}});
  expect(screen.getByRole('status').textContent).toContain('No supported face control matches');
});

it('does not let a preset rewrite saved expression, pose, or an unsupported shape',()=>{
  const onPreset=vi.fn(),saved={smile:.8,jaw_open:.4,blink:.2,nose_tip_size:.9};
  render(<LikenessControls onPreset={onPreset} context="goal" supportedKeys={['nose_bridge_width','jaw_width']}/>);
  fireEvent.click(screen.getByRole('button',{name:'Broader features'}));
  expect(onPreset).toHaveBeenCalledExactlyOnceWith({nose_bridge_width:.45,jaw_width:.65});
  expect({...saved,...onPreset.mock.calls[0][0]}).toMatchObject(saved);
});

it('disables shape presets until a model has supported shape controls',()=>{
  const onPreset=vi.fn();render(<LikenessControls onPreset={onPreset} context="current" supportedKeys={[]}/>);
  expect(screen.getByRole('button',{name:'Neutral face'}).matches(':disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Neutral face'}));expect(onPreset).not.toHaveBeenCalled();
});
