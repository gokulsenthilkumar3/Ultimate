import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import WardrobeOptions from './WardrobeOptions';
import {sanitizeWardrobePreferences,wardrobeDefaults} from '../../lib/wardrobePreferences';

afterEach(cleanup);
it('labels adjustments, exposes outfit-local reset and retries a failed save',()=> {
  const onChange=vi.fn();
  render(<WardrobeOptions preset="FORMAL" preferences={sanitizeWardrobePreferences()} status="error" onChange={onChange}/>);
  fireEvent.change(screen.getByRole('combobox',{name:'Garment style'}),{target:{value:'suit'}});
  expect(onChange).toHaveBeenLastCalledWith({options:{variant:'suit'}});
  fireEvent.click(screen.getByText('Fit adjustments'));
  fireEvent.change(screen.getByRole('slider',{name:'Extra surface clearance (cm)'}),{target:{value:'2.5'}});
  expect(onChange).toHaveBeenLastCalledWith({options:{easeCm:2.5}});
  fireEvent.click(screen.getByRole('button',{name:'Reset this outfit'}));
  expect(onChange).toHaveBeenLastCalledWith({options:wardrobeDefaults('FORMAL')});
  fireEvent.click(screen.getByRole('button',{name:'Retry outfit save'}));
  expect(onChange).toHaveBeenLastCalledWith({});
});
it('routes anatomical customization to its own controls and offers covered clothing',()=> {
  const onChange=vi.fn(),onOpenAnatomy=vi.fn();
  render(<WardrobeOptions preset="ANATOMICAL" preferences={sanitizeWardrobePreferences()} onChange={onChange} onOpenAnatomy={onOpenAnatomy}/>);
  expect(screen.queryByRole('combobox',{name:'Garment fabric'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Customize anatomy'}));expect(onOpenAnatomy).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button',{name:'Wear underwear'}));expect(onChange).toHaveBeenCalledWith({preset:'UNDERWEAR'});
});

it('keeps fabric details optional and can undo an outfit-local reset',()=>{
  const onChange=vi.fn(),preferences=sanitizeWardrobePreferences({outfits:{GYM:{fit:'relaxed',easeCm:3}}});
  const {container}=render(<WardrobeOptions preset="GYM" preferences={preferences} onChange={onChange}/>);
  expect([...container.querySelectorAll('details')].every(item=>!item.open)).toBe(true);
  expect(screen.getByRole('combobox',{name:'Garment fabric'}).closest('details').open).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'Reset this outfit'}));
  fireEvent.click(screen.getByRole('button',{name:'Undo outfit reset'}));
  expect(onChange).toHaveBeenLastCalledWith({options:preferences.outfits.GYM});
});
