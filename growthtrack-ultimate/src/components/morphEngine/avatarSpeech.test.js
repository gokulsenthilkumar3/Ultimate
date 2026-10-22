// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {createAvatarSpeech,sampleAvatarSpeech} from './avatarSpeech';

function fixture(context='current'){
  let utterance;const canvas={},synthesis={speak:vi.fn(value=>{utterance=value;}),cancel:vi.fn()},onState=vi.fn();
  const controller=createAvatarSpeech({canvas,context,synthesis,Utterance:class{constructor(text){this.text=text;}},now:()=>10,onState});
  return {canvas,synthesis,onState,controller,utterance:()=>utterance};
}
it('animates only after voice start, resynchronizes on boundaries, and closes bilabials',()=>{
  const f=fixture();f.controller.speak('aaa bee');
  expect(sampleAvatarSpeech(f.canvas,'current',10)).toBeNull();f.utterance().onstart();
  expect(sampleAvatarSpeech(f.canvas,'current',10.05)).toBeGreaterThan(.2);
  expect(sampleAvatarSpeech(f.canvas,'goal',10.05)).toBeNull();
  f.utterance().onboundary({charIndex:4});expect(sampleAvatarSpeech(f.canvas,'current',10)).toBe(.025);
  f.utterance().onend();expect(sampleAvatarSpeech(f.canvas,'current',11)).toBeNull();
});
it('stops on disposal and ignores late events from the retired voice',()=>{
  const f=fixture();f.controller.speak('hello');const old=f.utterance();old.onstart();f.controller.speak('again');
  old.onend();f.utterance().onstart();expect(sampleAvatarSpeech(f.canvas,'current',10)).not.toBeNull();
  f.controller.dispose();const calls=f.onState.mock.calls.length;f.utterance().onstart();f.utterance().onerror();
  expect(sampleAvatarSpeech(f.canvas,'current',10)).toBeNull();expect(f.onState).toHaveBeenCalledTimes(calls);expect(f.synthesis.cancel).toHaveBeenCalledTimes(2);
});
it('handles a missing voice service and a failed voice without a stuck mouth',()=>{
  expect(createAvatarSpeech({canvas:{}}).speak('hello')).toBe(false);
  const f=fixture();f.synthesis.speak.mockImplementation(()=>{throw new Error('unavailable');});
  expect(f.controller.speak('hello')).toBe(false);expect(sampleAvatarSpeech(f.canvas,'current',10)).toBeNull();expect(f.onState).toHaveBeenLastCalledWith('error');
});
