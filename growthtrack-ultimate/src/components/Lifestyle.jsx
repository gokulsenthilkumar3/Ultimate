import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, Trash2, Smile, Heart } from 'lucide-react';

const EMOJIS = ['🏃','💤','🧘','📚','🌳','💧','🍎','🧠','🏋️','☀️','🎵','🚴'];
const today = () => new Date().toISOString().slice(0,10);
const last7Days = () => Array.from({length:7},(_,i) => {const d=new Date();d.setDate(d.getDate()-(6-i));return d.toISOString().slice(0,10);});

export default function Lifestyle({ user, setUser }) {
  const upd = (s,d) => setUser({...user,[s]:{...(user?.[s]||{}),...d}});
  const lf = user?.lifestyle||{habits:[],mood:[],screenTime:null,outdoorMinutes:null};
  const habits = Array.isArray(lf?.habits)?lf.habits:[];
  const moodLog = lf.mood||[];
  const [hf,setHf]=useState({name:'',icon:'🏃'});
  const [mf,setMf]=useState({score:7,note:''});
  const [mt,setMt]=useState({screenTime:lf.screenTime||'',outdoorMinutes:lf.outdoorMinutes||''});

  const addHabit=()=>{if(!hf.name)return;upd('lifestyle',{habits:[...habits,{id:Date.now(),name:hf.name,icon:hf.icon,streak:0,completedDates:[]}]});setHf({name:'',icon:'🏃'});};

  const toggleDay=(hid,date)=>{
    const updated=habits.map(h=>{if(h.id!==hid)return h;const ds=h.completedDates||[];const nd=ds.includes(date)?ds.filter(d=>d!==date):[...ds,date];let streak=0;const sd=nd.slice().sort();for(let i=sd.length-1;i>=0;i--){const exp=new Date();exp.setDate(exp.getDate()-(sd.length-1-i));if(sd[i]===exp.toISOString().slice(0,10))streak++;else break;}return{...h,completedDates:nd,streak};});
    upd('lifestyle',{habits:updated});
  };

  const logMood=()=>{const ex=moodLog.filter(m=>m.date!==today());upd('lifestyle',{mood:[...ex,{date:today(),score:mf.score,note:mf.note}]});setMf({score:7,note:''});};
  const saveMetrics=()=>upd('lifestyle',{screenTime:mt.screenTime?Number(mt.screenTime):null,outdoorMinutes:mt.outdoorMinutes?Number(mt.outdoorMinutes):null});

  const d7=last7Days();
  const moodChart=d7.map(d=>{const e=moodLog.find(m=>m.date===d);return{date:d.slice(5),score:e?.score??null};});
  const todaysMood=moodLog.find(m=>m.date===today());

  return (
    <div className="fade-in" style={{padding:'0.5rem 0'}}>
      <div style={{marginBottom:'1.75rem'}}>
        <p className="label-caps" style={{marginBottom:'0.35rem',color:'var(--accent)'}}>Lifestyle</p>
        <h2 className="text-display" style={{fontSize:'2rem',marginBottom:'0.35rem'}}>
          <Heart size={24} style={{display:'inline',verticalAlign:'middle',marginRight:'0.3rem'}} />Lifestyle
        </h2>
        <p style={{color:'var(--text-3)',fontSize:'0.85rem'}}>Habit streaks, mood tracking, and daily wellness metrics.</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:'1.25rem',marginBottom:'1.5rem'}}>
        <div className="glass-card" style={{gridColumn:habits.length>0?'span 2':'span 1'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:'0.5rem'}}>
            <span className="card-title" style={{margin:0}}>Habit Tracker — 7 Day Grid</span>
            <div style={{display:'flex',gap:'0.4rem'}}>
              <input placeholder="Habit name" value={hf.name} onChange={e=>setHf({...hf,name:e.target.value})} className="form-input" style={{maxWidth:'160px'}} />
              <select value={hf.icon} onChange={e=>setHf({...hf,icon:e.target.value})} className="form-input" style={{width:'auto',fontSize:'1rem'}}>
                {EMOJIS.map(em=><option key={em} value={em}>{em}</option>)}
              </select>
              <button onClick={addHabit} className="btn-primary" style={{padding:'0.4rem 0.75rem'}}><Plus size={14}/></button>
            </div>
          </div>
          {habits.length===0&&<p style={{fontSize:'0.82rem',color:'var(--text-3)'}}>No habits yet. Add your first habit above.</p>}
          {habits.length>0&&(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'separate',borderSpacing:'0 0.35rem'}}>
                <thead><tr>
                  <th style={{textAlign:'left',fontSize:'0.68rem',color:'var(--text-3)',fontWeight:600,padding:'0 0.5rem',minWidth:140}}>Habit</th>
                  {d7.map(d=><th key={d} style={{textAlign:'center',fontSize:'0.62rem',color:'var(--text-3)',fontWeight:600,padding:'0 0.15rem',minWidth:36}}>{d.slice(5)}</th>)}
                  <th style={{textAlign:'center',fontSize:'0.68rem',color:'var(--text-3)',fontWeight:600,padding:'0 0.5rem'}}>🔥</th><th/>
                </tr></thead>
                <tbody>{habits.map(h=>(
                  <tr key={h.id}>
                    <td style={{padding:'0.35rem 0.5rem',fontSize:'0.82rem',color:'var(--text-1)'}}>{h.icon} {h.name}</td>
                    {d7.map(d=>{const done=(h.completedDates||[]).includes(d);return(
                      <td key={d} style={{textAlign:'center',padding:'0 0.15rem'}}>
                        <button onClick={()=>toggleDay(h.id,d)} title={d} style={{width:28,height:28,borderRadius:'var(--radius-sm)',border:'none',cursor:'pointer',background:done?'var(--accent)':'var(--bg-elevated)',color:done?'#fff':'var(--text-3)',fontSize:'0.72rem',fontWeight:700,transition:'all 0.15s ease'}}>{done?'✓':'·'}</button>
                      </td>
                    );})}
                    <td style={{textAlign:'center',padding:'0 0.5rem',fontSize:'0.85rem',fontWeight:700,color:'var(--accent)'}}>{h.streak}</td>
                    <td><button onClick={()=>upd('lifestyle',{habits:habits.filter(x=>x.id!==h.id)})} style={{background:'none',border:'none',color:'var(--danger)',cursor:'pointer',padding:'3px',display:'flex'}}><Trash2 size={13}/></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card">
          <span className="card-title">Mood Log</span>
          {todaysMood&&(<div style={{marginTop:'0.75rem',marginBottom:'0.75rem',padding:'0.65rem',background:'var(--bg-elevated)',borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',gap:'0.75rem',border:'1px solid var(--border)'}}>
            <Smile size={20} color="var(--accent)"/><div><p style={{fontSize:'0.82rem',fontWeight:700,color:'var(--text-1)'}}>Today: {todaysMood.score}/10</p>{todaysMood.note&&<p style={{fontSize:'0.7rem',color:'var(--text-3)'}}>{todaysMood.note}</p>}</div>
          </div>)}
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',marginTop:todaysMood?0:'0.75rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}><span style={{fontSize:'0.78rem',color:'var(--text-3)',minWidth:60}}>Mood: {mf.score}/10</span><input type="range" min={1} max={10} value={mf.score} onChange={e=>setMf({...mf,score:Number(e.target.value)})} style={{flex:1,accentColor:'var(--accent)'}}/></div>
            <input placeholder="Optional note" value={mf.note} onChange={e=>setMf({...mf,note:e.target.value})} className="form-input"/>
            <button onClick={logMood} className="btn-primary" style={{width:'100%',justifyContent:'center'}}>Log Mood</button>
          </div>
        </div>

        <div className="glass-card">
          <span className="card-title">7-Day Mood Trend</span>
          {moodLog.length>0?(
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={moodChart}><defs><linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/><stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="date" tick={{fontSize:10,fill:'var(--text-3)'}}/><YAxis domain={[0,10]} tick={{fontSize:10,fill:'var(--text-3)'}}/>
                <Tooltip contentStyle={{background:'var(--bg-glass)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',backdropFilter:'blur(12px)'}}/><Area type="monotone" dataKey="score" stroke="var(--accent)" fill="url(#moodGrad)" strokeWidth={2} connectNulls/>
              </AreaChart>
            </ResponsiveContainer>
          ):(<p style={{fontSize:'0.82rem',color:'var(--text-3)',textAlign:'center',padding:'2rem 0'}}>Log mood daily to see the trend</p>)}
        </div>

        <div className="glass-card">
          <span className="card-title">Daily Metrics</span>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginTop:'0.75rem',marginBottom:'0.75rem'}}>
            {[{label:'Screen Time (hrs)',key:'screenTime'},{label:'Outdoor (mins)',key:'outdoorMinutes'}].map(f=>(
              <div key={f.key}><p style={{fontSize:'0.7rem',color:'var(--text-3)',marginBottom:'0.3rem'}}>{f.label}</p>
                <input type="number" value={mt[f.key]} onChange={e=>setMt({...mt,[f.key]:e.target.value})} className="form-input" style={{textAlign:'center',fontWeight:700,fontSize:'1rem'}}/>
              </div>
            ))}
          </div>
          <button onClick={saveMetrics} className="btn-primary" style={{width:'100%',justifyContent:'center'}}>Save</button>
        </div>
      </div>
    </div>
  );
}
