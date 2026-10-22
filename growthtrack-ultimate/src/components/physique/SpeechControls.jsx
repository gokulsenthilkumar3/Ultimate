import React,{useEffect,useRef,useState} from 'react';
import {createAvatarSpeech} from '../morphEngine/avatarSpeech';

export default function SpeechControls({viewerRef,context,ownerId,available=true}){
  const [text,setText]=useState('Hello. You can customize my appearance and move my hands and feet.');
  const [status,setStatus]=useState('idle'),[voices,setVoices]=useState([]),[voice,setVoice]=useState(''),[rate,setRate]=useState(1);
  const [listening,setListening]=useState(false),[inputError,setInputError]=useState('');
  const controller=useRef(null),recognition=useRef(null);
  const synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance;
  const Recognition=globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  useEffect(()=>{
    if(!synthesis)return;
    const refresh=()=>setVoices(synthesis.getVoices());refresh();
    synthesis.addEventListener('voiceschanged',refresh);return()=>synthesis.removeEventListener('voiceschanged',refresh);
  },[synthesis]);
  useEffect(()=>()=>{controller.current?.dispose();controller.current=null;const input=recognition.current;recognition.current=null;input?.abort();setListening(false);},[ownerId,context,available]);
  const stop=()=>{controller.current?.stop();const input=recognition.current;recognition.current=null;input?.abort();setListening(false);};
  useEffect(()=>{const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[]);
  function speak(){
    stop();controller.current?.dispose();
    const canvas=viewerRef.current?.querySelector('canvas');if(!canvas)return setStatus('error');
    controller.current=createAvatarSpeech({canvas,context,synthesis,Utterance,onState:setStatus});
    controller.current.speak(text,{rate,voice:voices.find(v=>v.voiceURI===voice)});
  }
  function dictate(){
    if(!Recognition)return;stop();setInputError('');
    const instance=new Recognition();recognition.current=instance;
    instance.lang=voices.find(v=>v.voiceURI===voice)?.lang || navigator.language;instance.interimResults=false;instance.continuous=false;
    instance.onstart=()=>{if(recognition.current===instance)setListening(true);};
    instance.onresult=event=>{if(recognition.current===instance)setText(String(event.results[0][0].transcript).slice(0,1000));};
    instance.onerror=event=>{if(recognition.current===instance && event.error!=='aborted')setInputError('Voice input unavailable. You can type the text instead.');};
    instance.onend=()=>{if(recognition.current===instance){recognition.current=null;setListening(false);}};
    try{instance.start();}catch{recognition.current=null;setListening(false);setInputError('Voice input could not start. You can type instead.');}
  }
  return <fieldset className="avatar-speech-controls"><legend>Speak · {context==='goal'?'Goal':'Current'}</legend>
    <label className="workspace-field"><span>Speech text</span><textarea aria-label="Speech text" rows={3} maxLength={1000} value={text} onChange={e=>setText(e.target.value)}/></label>
    <label className="workspace-field"><span>Voice</span><select aria-label="Speech voice" value={voice} onChange={e=>setVoice(e.target.value)}><option value="">Device default</option>{voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>)}</select></label>
    <label className="avatar-range-field"><span>Speaking speed <output>{rate.toFixed(1)}×</output></span><input aria-label="Speaking speed" type="range" min="0.5" max="1.5" step="0.1" value={rate} onChange={e=>setRate(Number(e.target.value))}/></label>
    <div className="avatar-model-tools__actions">
      <button type="button" className="chamber-pill" onClick={speak} disabled={!available || !synthesis || !Utterance || !text.trim()}>Speak text</button>
      <button type="button" className="chamber-pill" onClick={stop} disabled={!['speaking','queued'].includes(status) && !listening}>Stop speech</button>
      {Recognition && <button type="button" className="chamber-pill" onClick={dictate} disabled={!available || listening}>Dictate text</button>}
    </div>
    <p role="status">{listening?'Listening…':!synthesis?'Speech is unavailable in this browser.':!available?'Open a single 3D model to speak.':status==='speaking'?'Speaking…':status==='queued'?'Starting voice…':status==='error'?'Voice playback failed. Try another device voice.':'Ready to speak.'}</p>
    <small>Mouth timing is approximate. Text is passed to the selected browser voice. Dictation may use your browser’s online speech service; microphone access starts only when you choose Dictate text.</small>
    {inputError && <p role="alert">{inputError}</p>}
  </fieldset>;
}
