import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

const PRIORITIES = [
  { key: 'High', label: '🔴 High', color: '#ef4444' },
  { key: 'Medium', label: '🟡 Medium', color: '#f59e0b' },
  { key: 'Low', label: '🟢 Low', color: '#10b981' },
];
const TAGS = ['fitness','finance','work','personal','health','learning'];

const today = () => new Date().toISOString().slice(0,10);
const isOverdue = (task) => !task.done && task.dueDate && task.dueDate < today();

export default function Tasks({ user, setUser }) {
  const upd = (s,d) => setUser({...user,[s]:{...(user?.[s]||{}),...d}});
  const tasks = user?.tasks || { pending:[], completed:[], recurring:[] };
  const [form,setForm] = useState({title:'',priority:'Medium',dueDate:'',tag:'personal',recurring:false,frequency:'daily'});
  const [tab,setTab] = useState('pending');

  const addTask = () => {
    if (!form.title.trim()) return;
    const t = {...form, done:false, id:Date.now()};
    if (form.recurring) {
      upd('tasks',{recurring:[...(tasks.recurring||[]),{id:Date.now(),title:form.title,frequency:form.frequency,lastDone:null}],pending:[...(tasks.pending||[]),t]});
    } else {
      upd('tasks',{pending:[...(tasks.pending||[]),t]});
    }
    setForm({title:'',priority:'Medium',dueDate:'',tag:'personal',recurring:false,frequency:'daily'});
  };

  const completeTask = (id) => {
    const t = (tasks.pending||[]).find(x=>x.id===id);
    if (!t) return;
    upd('tasks',{pending:(tasks.pending||[]).filter(x=>x.id!==id),completed:[...(tasks.completed||[]),{...t,done:true,completedAt:new Date().toISOString()}]});
  };

  const deleteTask = (id,list) => upd('tasks',{[list]:(tasks[list]||[]).filter(x=>x.id!==id)});

  const lanes = PRIORITIES.map(p=>({...p,items:(tasks.pending||[]).filter(t=>t.priority===p.key)}));

  return (
    <div className="fade-in" style={{padding:'0.5rem 0'}}>
      <div style={{marginBottom:'1.75rem'}}>
        <p className="label-caps" style={{marginBottom:'0.35rem',color:'var(--accent)'}}>Tasks</p>
        <h2 className="text-display" style={{fontSize:'2rem',marginBottom:'0.35rem'}}>
          <CheckSquare size={24} style={{display:'inline',verticalAlign:'middle',marginRight:'0.3rem'}} />Task Manager
        </h2>
        <p style={{color:'var(--text-3)',fontSize:'0.85rem'}}>Priority lanes — stay on top of everything.</p>
      </div>

      <div className="glass-card" style={{marginBottom:'1.5rem'}}>
        <span className="card-title">Quick Add</span>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'0.5rem',marginTop:'0.75rem',marginBottom:'0.5rem'}}>
          <input placeholder="Task title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
            onKeyDown={e=>e.key==='Enter'&&addTask()} className="form-input" style={{gridColumn:'1/-1'}}/>
          <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="form-input">
            {PRIORITIES.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <select value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})} className="form-input">
            {TAGS.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})} className="form-input"/>
          <label style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.78rem',cursor:'pointer',color:'var(--text-2)'}}>
            <input type="checkbox" checked={form.recurring} onChange={e=>setForm({...form,recurring:e.target.checked})}/><RefreshCw size={14}/> Recurring
          </label>
          {form.recurring&&<select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})} className="form-input">
            {['daily','weekly'].map(f=><option key={f} value={f}>{f}</option>)}
          </select>}
        </div>
        <button onClick={addTask} className="btn-primary" style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
          <Plus size={16}/> Add Task
        </button>
      </div>

      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem'}}>
        {['pending','completed','recurring'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`btn-sm${tab===t?' active':''}`} style={{textTransform:'capitalize'}}>
            {t} {t!=='recurring'&&<span style={{opacity:0.7}}>({(tasks[t]||[]).length})</span>}
          </button>
        ))}
      </div>

      {tab==='pending'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'1rem'}}>
          {lanes.map(lane=>(
            <div key={lane.key}>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.6rem'}}>
                <span style={{width:10,height:10,borderRadius:'50%',background:lane.color,display:'inline-block'}}/>
                <p style={{fontWeight:700,fontSize:'0.85rem',color:'var(--text-1)'}}>{lane.label}</p>
                <span style={{fontSize:'0.72rem',color:'var(--text-3)'}}>({lane.items.length})</span>
              </div>
              {lane.items.length===0&&<p style={{fontSize:'0.72rem',color:'var(--text-3)',padding:'0.75rem',background:'var(--bg-elevated)',borderRadius:'var(--radius-sm)'}}>No {lane.key.toLowerCase()} tasks</p>}
              <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                {lane.items.map(task=>(
                  <div key={task.id} style={{background:'var(--bg-elevated)',padding:'0.75rem',borderRadius:'var(--radius-sm)',border:isOverdue(task)?'1px solid rgba(239,68,68,0.4)':'1px solid var(--border)',boxShadow:isOverdue(task)?'0 0 8px rgba(239,68,68,0.12)':'none'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                          {isOverdue(task)&&<AlertCircle size={12} color="#ef4444"/>}
                          <p style={{fontSize:'0.85rem',fontWeight:600,color:'var(--text-1)'}}>{task.title}</p>
                        </div>
                        <p style={{fontSize:'0.68rem',color:'var(--text-3)',marginTop:'0.2rem'}}>{task.tag}{task.dueDate&&` · Due ${task.dueDate}`}{task.recurring&&' · ↻'}</p>
                      </div>
                      <div style={{display:'flex',gap:'0.3rem',marginLeft:'0.5rem'}}>
                        <button onClick={()=>completeTask(task.id)} style={{background:'rgba(16,185,129,0.12)',color:'#10b981',border:'none',padding:'5px',borderRadius:'var(--radius-sm)',cursor:'pointer',display:'flex'}}><CheckSquare size={14}/></button>
                        <button onClick={()=>deleteTask(task.id,'pending')} style={{background:'rgba(239,68,68,0.12)',color:'#ef4444',border:'none',padding:'5px',borderRadius:'var(--radius-sm)',cursor:'pointer',display:'flex'}}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='completed'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          {(tasks.completed||[]).length===0&&<p style={{color:'var(--text-3)',fontSize:'0.82rem'}}>No completed tasks yet.</p>}
          {(tasks.completed||[]).slice().reverse().map(task=>(
            <div key={task.id} style={{background:'rgba(34,197,94,0.05)',padding:'0.75rem',borderRadius:'var(--radius-sm)',border:'1px solid rgba(34,197,94,0.2)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <p style={{fontSize:'0.85rem',fontWeight:600,textDecoration:'line-through',color:'var(--text-3)'}}>{task.title}</p>
                <p style={{fontSize:'0.68rem',color:'var(--text-3)'}}>{task.tag} · {task.completedAt?.slice(0,10)}</p>
              </div>
              <button onClick={()=>deleteTask(task.id,'completed')} style={{background:'rgba(239,68,68,0.12)',color:'#ef4444',border:'none',padding:'5px',borderRadius:'var(--radius-sm)',cursor:'pointer',display:'flex'}}><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      )}

      {tab==='recurring'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          {(tasks.recurring||[]).length===0&&<p style={{color:'var(--text-3)',fontSize:'0.82rem'}}>No recurring tasks. Add one above with the Recurring toggle.</p>}
          {(tasks.recurring||[]).map(r=>(
            <div key={r.id} style={{background:'var(--bg-elevated)',padding:'0.75rem',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <p style={{fontSize:'0.85rem',fontWeight:600,color:'var(--text-1)'}}>{r.title}</p>
                <p style={{fontSize:'0.68rem',color:'var(--text-3)'}}>↻ {r.frequency} · Last done: {r.lastDone||'never'}</p>
              </div>
              <button onClick={()=>deleteTask(r.id,'recurring')} style={{background:'rgba(239,68,68,0.12)',color:'#ef4444',border:'none',padding:'5px',borderRadius:'var(--radius-sm)',cursor:'pointer',display:'flex'}}><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
