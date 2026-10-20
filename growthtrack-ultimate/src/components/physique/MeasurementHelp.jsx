import React, { useId, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import './measurement-guides.css';
import use3DStore from '../../store/use3DStore';
import useStore from '../../store/useStore';

const points = {
  body: [130, 160, 52, 10], head: [130, 48, 20, 7], neck: [130, 82, 12, 5], shoulders: [130, 101, 46, 9],
  chest: [130, 127, 31, 9], waist: [130, 165, 27, 8], glutes: [130, 193, 35, 10],
  leftArm: [174, 133, 12, 5], rightArm: [86, 133, 12, 5], leftForearm: [187, 167, 10, 4], rightForearm: [73, 167, 10, 4],
  leftHand: [196, 194, 9, 4], rightHand: [64, 194, 9, 4], leftThigh: [147, 235, 14, 5], rightThigh: [113, 235, 14, 5],
  calves: [147, 281, 10, 4], leftFoot: [148, 312, 11, 4], rightFoot: [112, 312, 11, 4], anatomy: [130, 204, 16, 6],
};

export default function MeasurementHelp({ definition, label, onInspect }) {
  const workspaceGuideDetail = use3DStore(s => s.avatarWorkspace.guideDetail);
  const savedGuideDetail = useStore(s => s.physiqueTargets?.viewerPreferences?.guideDetail);
  const guideDetail = ['concise','detailed'].includes(savedGuideDetail) ? savedGuideDetail : workspaceGuideDetail;
  const titleId = useId(), descriptionId = useId();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const [x, y, rx, ry] = points[definition.region] || points.body;
  const local = definition.quantity === 'section' || definition.quantity === 'sectionLength';
  const sectionX = { base: 80, middle: 130, distal: 180 }[definition.section] || 130;
  const move = (dx, dy) => setPan(p => ({ x: Math.max(-220, Math.min(220, p.x + dx)), y: Math.max(-280, Math.min(280, p.y + dy)) }));
  return <section className="measurement-help" aria-label={`How to measure ${label}`}>
    <div className="measurement-help__heading"><div><span>Measurement guide</span><h3>{label}</h3></div><span className="measurement-help__quantity">{definition.quantity === 'girth' ? 'Circumference' : definition.quantity === 'section' ? 'Section circumference' : definition.quantity}</span></div>
    <svg className="measurement-help__diagram" viewBox="0 0 260 350" role="img" aria-labelledby={`${titleId} ${descriptionId}`}
      onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; }}
      onPointerMove={event => { const d = drag.current; if (!d || d.id !== event.pointerId) return; const bounds = event.currentTarget.getBoundingClientRect(); move((event.clientX - d.x) * 260 / bounds.width, (event.clientY - d.y) * 350 / bounds.height); drag.current = { ...d, x: event.clientX, y: event.clientY }; }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <title id={titleId}>{label} — illustrated measurement location</title><desc id={descriptionId}>{definition.site} Solid line: visible measurement path. Dashed line: hidden portion or reference. Generic schematic, not personal geometry.</desc>
      <g transform={`translate(${pan.x} ${pan.y}) translate(130 175) scale(${zoom}) translate(-130 -175)`}>
        {local ? <>
          <rect x="35" y="108" width="28" height="125" rx="4" className="measurement-help__body" />
          <path d="M63 136Q140 129 200 145Q218 151 218 174Q218 197 200 203Q140 219 63 211Z" className="measurement-help__body" />
          <text x="28" y="91">Attachment</text><text x="184" y="235">Tip →</text>
          {[80,130,180].map((cx,i)=><g key={cx}><ellipse cx={cx} cy="174" rx="10" ry="38" className="measurement-help__reference"/><text x={cx-16} y="263">{['Base','Middle','Distal'][i]}</text></g>)}
          {definition.quantity === 'section' ? <><path d={`M${sectionX} 136A10 38 0 0 0 ${sectionX} 212`} className="measurement-help__path measurement-help__hidden"/><path d={`M${sectionX} 136A10 38 0 0 1 ${sectionX} 212`} className="measurement-help__path"/></> : <path d="M63 289H218M63 282V296M218 282V296" className="measurement-help__path"/>}
        </> : definition.quantity === 'depth' ? <>
          <ellipse cx="130" cy="46" rx="18" ry="24" className="measurement-help__body"/>
          <path d="M118 70L118 85Q103 103 110 140L106 172Q94 184 101 205L116 242L117 308L132 308L141 243L153 207Q161 195 149 174L151 142Q175 118 153 96L141 84L141 70Z" className="measurement-help__body"/>
          <path d={`M108 ${y}H156M108 ${y-5}V${y+5}M156 ${y-5}V${y+5}`} className="measurement-help__path"/>
          <text x="78" y="340">Side view · back → front</text>
        </> : definition.region === 'anatomy' ? <>
          <ellipse cx="130" cy="170" rx="49" ry="65" className="measurement-help__body"/>
          {definition.quantity === 'volume' ? <ellipse cx="130" cy="170" rx="51" ry="67" className="measurement-help__envelope"/> : definition.quantity === 'width' ? <path d="M81 170H179M81 164V176M179 164V176" className="measurement-help__path"/> : <path d="M130 105V235M124 105H136M124 235H136" className="measurement-help__path"/>}
          <text x="53" y="280">Generic external envelope / section</text>
        </> : <>
          <ellipse cx="130" cy="46" rx="19" ry="24" className="measurement-help__body"/>
          <path d="M117 70L117 83L94 93Q85 97 81 113L54 193Q52 206 64 204L94 140L99 177L91 206L101 307L115 307L130 226L145 307L159 307L169 206L161 177L166 140L196 204Q208 206 206 193L179 113Q175 97 166 93L143 83L143 70ZM101 307L115 307L119 318L96 318ZM145 307L159 307L165 318L141 318Z" className="measurement-help__body"/>
          {definition.id === 'height' ? <path d="M38 22V318M32 22H110M32 318H94" className="measurement-help__path"/> : definition.quantity === 'girth' ? <>
            <path d={`M${x-rx} ${y}A${rx} ${ry} 0 0 1 ${x+rx} ${y}`} className="measurement-help__path measurement-help__hidden"/>
            <path d={`M${x-rx} ${y}A${rx} ${ry} 0 0 0 ${x+rx} ${y}`} className="measurement-help__path"/>
          </> : definition.quantity === 'width' ? <path d={`M${x-rx} ${y}H${x+rx}M${x-rx} ${y-5}V${y+5}M${x+rx} ${y-5}V${y+5}`} className="measurement-help__path"/> : definition.quantity === 'depth' ? <>
            <ellipse cx="130" cy={y} rx="30" ry="18" className="measurement-help__body"/>
            <path d={`M130 ${y-18}V${y+18}M125 ${y-18}H135M125 ${y+18}H135`} className="measurement-help__path"/>
            <text x="47" y={y+43}>Local section: front ↕ back</text>
          </> : definition.quantity === 'length' ? <path d={`M${x} ${y-20}V${y+20}M${x-5} ${y-20}H${x+5}M${x-5} ${y+20}H${x+5}`} className="measurement-help__path"/> : <ellipse cx={x} cy={y} rx={Math.max(rx,25)} ry={definition.quantity==='volume'?32:22} className="measurement-help__envelope"/>}
          <text x="95" y="340">Front view</text>
        </>}
      </g>
    </svg>
    <div className="measurement-help__tools" role="group" aria-label="Diagram navigation">
      <button type="button" aria-label="Zoom in measurement diagram" disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, z + .25))}><ZoomIn size={15}/></button>
      <button type="button" aria-label="Zoom out measurement diagram" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .25))}><ZoomOut size={15}/></button>
      <button type="button" aria-label="Move diagram left" onClick={() => move(-15,0)}><ArrowLeft size={15}/></button><button type="button" aria-label="Move diagram right" onClick={() => move(15,0)}><ArrowRight size={15}/></button>
      <button type="button" aria-label="Move diagram up" onClick={() => move(0,-15)}><ArrowUp size={15}/></button><button type="button" aria-label="Move diagram down" onClick={() => move(0,15)}><ArrowDown size={15}/></button>
      <button type="button" aria-label="Reset measurement diagram" onClick={() => { setZoom(1); setPan({x:0,y:0}); }}><RotateCcw size={15}/></button>
    </div>
    <p className="measurement-help__caption">Generic location guide · {Math.round(zoom*100)}% · Drag to move the diagram.</p>
    <details className="measurement-help__instructions" open={guideDetail !== 'concise'}><summary>Measurement instructions</summary><dl><dt>What it means</dt><dd>{definition.site}</dd><dt>How to measure</dt><dd>{definition.method}</dd><dt>What it changes</dt><dd>{definition.effect}</dd><dt>Watch for</dt><dd>{definition.warning}</dd></dl></details>
    <p className="measurement-help__support">{definition.support}</p>
    {onInspect && <button type="button" className="chamber-pill" onClick={() => onInspect(definition.region)}>Inspect this part in 3D</button>}
  </section>;
}
