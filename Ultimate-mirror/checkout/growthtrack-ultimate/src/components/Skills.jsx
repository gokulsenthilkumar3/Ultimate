import React, { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { BookOpen, Award, Target, Plus, Search, Filter, TrendingUp, Save, Edit3, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Skills() {
  const skills = useStore(state => state.skills) || [];
  const fetchInitialData = useStore(state => state.fetchInitialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [localSkills, setLocalSkills] = useState(skills);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  // Sync local state when store changes
  React.useEffect(() => {
    setLocalSkills(skills);
  }, [skills]);

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(localSkills.map(s => s.category))];
    return cats;
  }, [localSkills]);

  const filteredSkills = useMemo(() => {
    return localSkills.filter(s => {
      const matchesSearch = s.label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [localSkills, searchTerm, activeCategory]);

  const handleSkillUpdate = (id, field, newValue) => {
    setLocalSkills(prev => prev.map(s => s.id === id ? { ...s, [field]: newValue } : s));
  };

  const saveToDatabase = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('http://localhost:3001/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSkills)
      });
      if (res.ok) {
        toast.success('Skill Matrix updated and saved to database!');
        fetchInitialData();
      }
    } catch (err) {
      toast.error('Failed to save skills');
    }
    setIsSaving(false);
  };

  const addNewSkill = () => {
    const newSkill = {
      id: Date.now().toString(),
      label: 'New Skill',
      description: 'Add a brief description here...',
      proficiency: 10,
      icon: '🎯',
      category: activeCategory === 'All' ? 'General' : activeCategory
    };
    setLocalSkills([newSkill, ...localSkills]);
  };

  const deleteSkill = (id) => {
    if(window.confirm('Remove this skill?')) {
      setLocalSkills(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="fade-in" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>Skill Matrix Intelligence</p>
          <h2 className="text-display" style={{ fontSize: '2.2rem' }}>Interactive Proficiency</h2>
          <p className="text-secondary">Track, update, and save your capabilities dynamically.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-ghost" onClick={addNewSkill}>
            <Plus size={16} /> ADD SKILL
          </button>
          <button className="btn-primary" onClick={saveToDatabase} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={16} /> {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 1rem', flex: 1, minWidth: '280px' }}>
          <Search size={16} color="var(--text-3)" />
          <input 
            type="text" 
            placeholder="Search skills (e.g. Python, Finance, Language)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', padding: '12px 0', outline: 'none', flex: 1, fontSize: '0.9rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`btn-sm ${activeCategory === cat ? 'active' : ''}`}
              style={{ whiteSpace: 'nowrap', padding: '0.6rem 1.25rem' }}
            >
              {cat}
            </button>
          ))}
          {/* Quick Add Specific Category Button */}
          {activeCategory === 'All' && (
             <button
               onClick={() => {
                 const cat = window.prompt('Enter new category name (e.g., Finance, Language):');
                 if (cat) {
                   const newSkill = {
                     id: Date.now().toString(),
                     label: 'New Skill',
                     description: '',
                     proficiency: 0,
                     icon: '🆕',
                     category: cat
                   };
                   setLocalSkills([newSkill, ...localSkills]);
                   setActiveCategory(cat);
                 }
               }}
               className="btn-sm"
               style={{ whiteSpace: 'nowrap', padding: '0.6rem 1.25rem', border: '1px dashed var(--accent)', color: 'var(--accent)', background: 'transparent' }}
             >
               + New Category
             </button>
          )}
        </div>
      </div>

      {/* Skill Grid by Category */}
      {categories.filter(cat => activeCategory === 'All' || cat === activeCategory).map(cat => {
        const catSkills = filteredSkills.filter(s => s.category === cat);
        if (catSkills.length === 0) return null;
        
        const avg = Math.round(catSkills.reduce((a, b) => a + b.proficiency, 0) / catSkills.length) || 0;

        return (
          <div key={cat} style={{ marginBottom: '3rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
               <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>{cat}</h3>
               <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'var(--bg-elevated)', borderRadius: '20px', fontWeight: 700 }}>
                 Avg: {avg}%
               </span>
               <input 
                 type="text" 
                 value={cat} 
                 onChange={(e) => {
                   const newCat = e.target.value;
                   if (newCat.trim() !== '') {
                     setLocalSkills(prev => prev.map(s => s.category === cat ? { ...s, category: newCat } : s));
                   }
                 }}
                 style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-3)', fontSize: '0.8rem', padding: '4px 8px', marginLeft: 'auto' }}
                 title="Rename Category"
               />
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
               {catSkills.map(skill => (
                 <div key={skill.id} className="glass-card stagger-item" style={{ padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                   
                   <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
                     <button onClick={() => deleteSkill(skill.id)} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete Skill">
                       <Trash2 size={14} />
                     </button>
                   </div>

                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '1rem', paddingRight: '40px' }}>
                     <input 
                       type="text" 
                       value={skill.icon} 
                       onChange={(e) => handleSkillUpdate(skill.id, 'icon', e.target.value)}
                       style={{ width: '45px', height: '45px', fontSize: '1.8rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center' }}
                       title="Emoji Icon"
                     />
                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                       <input 
                         type="text" 
                         value={skill.label} 
                         onChange={(e) => handleSkillUpdate(skill.id, 'label', e.target.value)}
                         placeholder="Skill Name"
                         style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent)', color: 'var(--text-1)', fontSize: '1.2rem', fontWeight: 800, width: '100%', paddingBottom: '2px' }}
                       />
                       <input 
                         type="text" 
                         value={skill.category} 
                         onChange={(e) => handleSkillUpdate(skill.id, 'category', e.target.value)}
                         placeholder="Category"
                         style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase', width: '100%' }}
                       />
                     </div>
                   </div>

                   <textarea
                     value={skill.description || ''}
                     onChange={(e) => handleSkillUpdate(skill.id, 'description', e.target.value)}
                     placeholder="Add skill description or notes..."
                     style={{ 
                       background: 'var(--bg-dark)', 
                       border: '1px solid var(--border)', 
                       borderRadius: '8px', 
                       padding: '0.75rem', 
                       color: 'var(--text-2)', 
                       fontSize: '0.85rem', 
                       width: '100%', 
                       minHeight: '60px',
                       marginBottom: '1rem',
                       resize: 'vertical'
                     }}
                   />

                   <div style={{ marginTop: 'auto' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 600 }}>Proficiency Level</label>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <input 
                           type="number" 
                           value={skill.proficiency} 
                           onChange={(e) => handleSkillUpdate(skill.id, 'proficiency', parseInt(e.target.value) || 0)}
                           min="0" max="100"
                           style={{ width: '50px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-1)', padding: '4px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }}
                         />
                         <span style={{ fontSize: '1.2rem', fontWeight: 800, color: skill.proficiency >= 80 ? 'var(--success)' : 'var(--accent)' }}>%</span>
                       </div>
                     </div>
                     <input
                       type="range"
                       min="0"
                       max="100"
                       step="1"
                       value={skill.proficiency}
                       onChange={(e) => handleSkillUpdate(skill.id, 'proficiency', parseInt(e.target.value) || 0)}
                       style={{
                         width: '100%',
                         height: '8px',
                         background: `linear-gradient(to right, ${skill.proficiency >= 80 ? 'var(--success)' : 'var(--accent)'} 0%, ${skill.proficiency >= 80 ? 'var(--success)' : 'var(--accent)'} ${skill.proficiency}%, var(--bg-elevated) ${skill.proficiency}%, var(--bg-elevated) 100%)`,
                         borderRadius: '4px',
                         outline: 'none',
                         appearance: 'none',
                         cursor: 'pointer'
                       }}
                     />
                   </div>

                   {skill.proficiency >= 80 && (
                     <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)' }}>
                       <TrendingUp size={16} style={{ color: '#22c55e' }} />
                       <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 700 }}>Mastery Achieved</span>
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </div>
        );
      })}

      {filteredSkills.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', opacity: 0.5 }}>
          <p>No skills found matching your criteria.</p>
          <button className="btn-primary" onClick={addNewSkill} style={{ marginTop: '1rem' }}>Create First Skill</button>
        </div>
      )}
    </div>
  );
}
