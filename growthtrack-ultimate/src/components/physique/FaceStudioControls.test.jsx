import React from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import LikenessControls from './LikenessControls';
import SpeechControls from './SpeechControls';
import {sampleAvatarSpeech} from '../morphEngine/avatarSpeech';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

it('keeps photo references local, rejects invalid files, and revokes object URLs',()=>{
  const create=vi.fn(()=> 'blob:local-reference'),revoke=vi.fn();
  vi.stubGlobal('URL',{createObjectURL:create,revokeObjectURL:revoke});
  const onPreset=vi.fn();render(<LikenessControls onPreset={onPreset} context="goal"/>);
  fireEvent.click(screen.getByRole('button',{name:'Neutral face'}));expect(onPreset).toHaveBeenCalledOnce();
  fireEvent.change(screen.getByLabelText('Face design mode'),{target:{value:'personal'}});
  fireEvent.change(screen.getByLabelText('Reference photo'),{target:{files:[new File(['x'],'model.glb',{type:'model/gltf-binary'})]}});
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPG');expect(create).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Reference photo'),{target:{files:[new File(['photo'],'face.png',{type:'image/png'})]}});
  expect(screen.getByRole('img')).toHaveAttribute('src','blob:local-reference');expect(onPreset).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button',{name:'Remove reference'}));expect(revoke).toHaveBeenCalledWith('blob:local-reference');
});

it('starts speech only on request and cancels it when the editing context changes',()=>{
  let utterance;const synthesis={getVoices:()=>[],addEventListener:vi.fn(),removeEventListener:vi.fn(),speak:vi.fn(u=>{utterance=u;}),cancel:vi.fn()};
  vi.stubGlobal('speechSynthesis',synthesis);vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(text){this.text=text;}});
  const canvas=document.createElement('canvas'),wrapper=document.createElement('div');wrapper.append(canvas);
  const props={viewerRef:{current:wrapper},context:'current',ownerId:'owner',available:true};
  const {rerender}=render(<SpeechControls {...props}/>);expect(synthesis.speak).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Speak text'}));act(()=>utterance.onstart());
  expect(sampleAvatarSpeech(canvas,'current')).not.toBeNull();
  rerender(<SpeechControls {...props} context="goal"/>);expect(synthesis.cancel).toHaveBeenCalledOnce();
  expect(sampleAvatarSpeech(canvas,'current')).toBeNull();
});

it('retires dictation on stop or loss of the single-model view, ignoring late recognition callbacks',()=>{
  const instances=[];
  vi.stubGlobal('SpeechRecognition',class{
    constructor(){instances.push(this);this.abort=vi.fn();}
    start(){this.onstart();}
  });
  const props={viewerRef:{current:null},context:'current',ownerId:'owner',available:true};
  const {rerender}=render(<SpeechControls {...props}/>);
  const dictate=()=>screen.getByRole('button',{name:'Dictate text'});
  fireEvent.click(dictate());expect(dictate()).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Stop speech'}));
  expect(instances[0].abort).toHaveBeenCalledOnce();expect(dictate()).toBeEnabled();
  act(()=>{instances[0].onstart();instances[0].onresult({results:[[{transcript:'stale text'}]]});});
  expect(dictate()).toBeEnabled();expect(screen.getByLabelText('Speech text')).not.toHaveValue('stale text');
  fireEvent.click(dictate());rerender(<SpeechControls {...props} available={false}/>);
  expect(instances[1].abort).toHaveBeenCalledOnce();
  rerender(<SpeechControls {...props}/>);expect(dictate()).toBeEnabled();
});
