// Speech is a transient performance, scoped to one canvas and edit context.
// It never writes text, microphone input or animated weights to the profile.
const sessions=new WeakMap();
const time=()=>performance.now()/1000;
export const AVATAR_SPEECH_EVENT = 'growthtrack:avatar-speech';
export const avatarSpeechActive = canvas => Boolean(sessions.get(canvas)?.speaking);

export function sampleAvatarSpeech(canvas,context,now=time()){
  const session=sessions.get(canvas);
  if(!session?.speaking || session.context!==context)return null;
  const elapsed=Math.max(0,now-session.at),index=session.index+Math.floor(elapsed*12*session.rate);
  const letter=session.text[index]?.toLowerCase();
  if(!letter || /[\s.,!?;:]/.test(letter))return 0;
  // Text timing is approximate; browser boundaries resync it when available.
  // Bilabials close the lips. Vowels open more than other consonants.
  if(/[bmp]/.test(letter))return .025;
  const peak=/[aeiou]/.test(letter) ? .68 : .28;
  return peak*(.35+.65*Math.sin((elapsed*6*session.rate%1)*Math.PI)**2);
}

export function createAvatarSpeech({canvas,context,synthesis,Utterance,onState=()=>{},now=time}){
  let active=null,disposed=false;
  const report=state=>{canvas?.dispatchEvent?.(new Event(AVATAR_SPEECH_EVENT));onState(state);};
  const stop=()=>{
    const owns=active && sessions.get(canvas)===active;
    if(owns)sessions.delete(canvas);
    active=null;
    if(owns)synthesis.cancel();
    if(!disposed)report('idle');
  };
  const speak=(text,{voice,rate=1}={})=>{
    if(disposed || !canvas || !synthesis || !Utterance)return false;
    const phrase=String(text).trim().slice(0,1000);if(!phrase)return false;
    stop();
    // Retire a previous controller on this canvas before handing it ownership.
    sessions.get(canvas)?.stop();
    const utterance=new Utterance(phrase);
    const session={text:phrase,context,index:0,at:0,rate:Math.max(.5,Math.min(1.5,Number(rate)||1)),speaking:false,stop};
    active=session;sessions.set(canvas,session);utterance.rate=session.rate;
    if(voice){utterance.voice=voice;utterance.lang=voice.lang;}
    const valid=()=>!disposed && active===session && sessions.get(canvas)===session;
    utterance.onstart=()=>{if(valid()){session.speaking=true;session.at=now();report('speaking');}};
    utterance.onboundary=e=>{if(valid() && Number.isFinite(e.charIndex)){session.index=e.charIndex;session.at=now();}};
    const finish=state=>{if(!valid())return;sessions.delete(canvas);active=null;report(state);};
    utterance.onend=()=>finish('idle');utterance.onerror=()=>finish('error');
    report('queued');
    try{synthesis.speak(utterance);}catch{finish('error');return false;}
    return true;
  };
  return {speak,stop,dispose(){stop();disposed=true;}};
}
