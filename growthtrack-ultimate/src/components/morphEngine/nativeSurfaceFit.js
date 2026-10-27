const finite=value=>value!=='' && value!=null && Number.isFinite(Number(value)) && Number(value)>0;
const read=(object,path)=>path.reduce((node,key)=>node?.[key],object);
function write(object,path,value){let node=object;for(const key of path.slice(0,-1))node=node[key] ||= {};node[path.at(-1)]=value;}

/** Calibrate an internal working copy against measured rendered triangles.
 * Saved measurements are never rewritten to conceal residuals.
 */
export function fitNativeSurface(profile,options,evaluate,{maximumIterations=12,initialWorking=null}={}){
  const working=structuredClone(initialWorking || profile || {}),state=options.state || 'resting',original=profile?.penis?.[state] || {};
  const m=original.measurements || {},mode=original.inputMode || 'circumference',targets=[];
  let current=evaluate(working),iterations=1;
  const add=(key,path,target,achieved,parameter=target,minimum=false)=>{
    if(finite(target)){if(!finite(read(working,path)))write(working,path,parameter);targets.push({key,path,requested:Number(target),achieved,minimum});}
  };
  const legacy=state==='resting'?options.legacy || {}:{};
  add('lengthCm',['penis',state,'measurements','lengthCm'],finite(m.lengthCm)?m.lengthCm:finite(legacy.anatomyLengthCm)?legacy.anatomyLengthCm:ANATOMY_REFERENCE.anatomyLengthCm.meanCm,s=>s.centrelineCm);
  if(mode==='dimensions'){
    for(const [key,result] of [['widthCm','midWidthCm'],['depthCm','midDepthCm']])add(key,['penis',state,'measurements',key],m[key],s=>s[result]);
  }else add('midCircumferenceCm',['penis',state,'measurements','midCircumferenceCm'],finite(m.midCircumferenceCm)?m.midCircumferenceCm:finite(legacy.anatomyGirthCm)?legacy.anatomyGirthCm:ANATOMY_REFERENCE.anatomyGirthCm.meanCm,s=>s.midCircumferenceCm);
  for(const key of ['baseCircumferenceCm','distalCircumferenceCm'])add(key,['penis',state,'measurements',key],m[key],s=>s[key]);
  const envelope=profile?.scrotum?.envelope || {},contracted=profile?.scrotum?.presentation==='contracted'?.82:1;
  for(const key of ['widthCm','heightCm','depthCm','hangCm']){
    const reference=Number(envelope[key]),factor=key==='hangCm'?1:contracted;
    add('scrotum.'+key,['scrotum','envelope',key],finite(reference)?reference*factor:null,s=>s.scrotum?.[key],reference,profile?.scrotum?.fitMode==='guides');
  }
  let report=[];
  function residuals(){
    report=targets.map(target=>{
      const achieved=target.achieved(current.surface || {}),residual=Number.isFinite(achieved)?achieved-target.requested:null;
      const toleranceCm=Math.max(.01,target.requested*.001);
      return {key:target.key,requested:target.requested,achieved:achieved ?? null,residualCm:residual,toleranceCm,minimum:target.minimum,
        passed:residual!=null && (target.minimum?residual>=-toleranceCm:Math.abs(residual)<=toleranceCm)};
    });
    return report.every(r=>r.passed);
  }
  while(!residuals() && iterations<maximumIterations && current.surface?.status==='measured'){
    targets.forEach((target,i)=>{
      const actual=report[i].achieved;if(!(actual>0) || report[i].passed)return;
      const parameter=Number(read(working,target.path));
      const ratio=Math.max(.6,Math.min(1.6,target.requested/actual));
      write(working,target.path,Math.max(.01,Math.min(1000,parameter*ratio)));
    });
    current=evaluate(working);iterations++;
  }
  const passed=residuals();
  return {...current,working,fit:{source:'rendered-native-surface',iterations,status:passed?'within-tolerance':current.surface?.status==='measured'?'outside-tolerance':'unsupported-surface',dimensions:report,
    rule:'Measured rendered dimensions; 0.1 mm or 0.1%, whichever is greater. Numerical surface tolerance is not clinical accuracy.'}};
}
import {ANATOMY_REFERENCE} from './anatomyCalibration';

export function refreshNativeFit(fit,surface){
  if(!fit)return null;
  const keys={lengthCm:'centrelineCm',widthCm:'midWidthCm',depthCm:'midDepthCm'};
  const dimensions=fit.dimensions.map(d=>{
    const achieved=d.key.startsWith('scrotum.')?surface?.scrotum?.[d.key.slice(8)]:surface?.[keys[d.key] || d.key];
    const residualCm=Number.isFinite(achieved)?achieved-d.requested:null;
    return {...d,achieved:achieved ?? null,residualCm,passed:residualCm!=null && (d.minimum?residualCm>=-d.toleranceCm:Math.abs(residualCm)<=d.toleranceCm)};
  });
  return {...fit,dimensions,status:surface?.status!=='measured'?'unsupported-surface':dimensions.every(d=>d.passed)?'within-tolerance':'outside-tolerance'};
}
