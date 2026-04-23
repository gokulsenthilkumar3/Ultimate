import React, { useState, useEffect } from 'react';
import EditableMetric from './EditableMetric';
import './HealthExtras.css';

/**
 * HealthExtras - Extended health tracking component
 * Includes 5 senses, diet, exercises, Bronco test, posture, hobbies
 */
const HealthExtras = () => {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('healthExtras');
    return saved ? JSON.parse(saved) : {
      senses: {
        vision: { clarity: 8, strain: 3, lastTest: '2024-01-15' },
        hearing: { acuity: 9, tinnitus: 2, lastTest: '2024-02-10' },
        smell: { sensitivity: 7, issues: 'None' },
        taste: { sensitivity: 8, issues: 'None' },
        touch: { sensitivity: 8, numbness: 'None' }
      },
      diet: {
        calories: 2200,
        protein: 120,
        carbs: 250,
        fats: 70,
        water: 3.5,
        supplements: ['Vitamin D', 'Omega-3']
      },
      exercises: [
        { name: 'Bench Press', sets: 4, reps: 10, weight: 60 },
        { name: 'Squats', sets: 4, reps: 12, weight: 80 },
        { name: 'Deadlifts', sets: 3, reps: 8, weight: 100 }
      ],
      broncoTest: {
        level: 8.5,
        vo2max: 45,
        date: '2024-03-15',
        score: 'Good'
      },
      posture: {
        neck: 'Moderate strain',
        back: 'Good',
        shoulders: 'Slight tension',
        lastCheck: '2024-04-20'
      },
      hobbies: [
        { name: 'Guitarist', hours: 5, progress: 'Intermediate' },
        { name: 'Coding', hours: 20, progress: 'Advanced' },
        { name: 'Reading', hours: 7, progress: 'Ongoing' }
      ]
    };
  });

  useEffect(() => {
    localStorage.setItem('healthExtras', JSON.stringify(data));
  }, [data]);

  const updateSense = (sense, field, value) => {
    setData(prev => ({
      ...prev,
      senses: {
        ...prev.senses,
        [sense]: { ...prev.senses[sense], [field]: value }
      }
    }));
  };

  const updateDiet = (field, value) => {
    setData(prev => ({
      ...prev,
      diet: { ...prev.diet, [field]: value }
    }));
  };

  const updateExercise = (index, field, value) => {
    setData(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const addExercise = () => {
    setData(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name: 'New Exercise', sets: 3, reps: 10, weight: 0 }]
    }));
  };

  const addHobby = () => {
    setData(prev => ({
      ...prev,
      hobbies: [...prev.hobbies, { name: 'New Hobby', hours: 0, progress: 'Beginner' }]
    }));
  };

  return (
    <div className="health-extras-container">
      <h1 className="page-title">🏥 Health Extras</h1>
      
      {/* Five Senses Section */}
      <section className="he-section">
        <h2 className="section-title">👁️ Five Senses Tracking</h2>
        <div className="senses-grid">
          <div className="sense-card">
            <h3>👁️ Vision</h3>
            <EditableMetric label="Clarity (1-10)" value={data.senses.vision.clarity} onChange={v => updateSense('vision', 'clarity', v)} />
            <EditableMetric label="Strain (1-10)" value={data.senses.vision.strain} onChange={v => updateSense('vision', 'strain', v)} />
            <EditableMetric label="Last Test" value={data.senses.vision.lastTest} onChange={v => updateSense('vision', 'lastTest', v)} type="date" />
          </div>
          <div className="sense-card">
            <h3>👂 Hearing</h3>
            <EditableMetric label="Acuity (1-10)" value={data.senses.hearing.acuity} onChange={v => updateSense('hearing', 'acuity', v)} />
            <EditableMetric label="Tinnitus (1-10)" value={data.senses.hearing.tinnitus} onChange={v => updateSense('hearing', 'tinnitus', v)} />
            <EditableMetric label="Last Test" value={data.senses.hearing.lastTest} onChange={v => updateSense('hearing', 'lastTest', v)} type="date" />
          </div>
          <div className="sense-card">
            <h3>👃 Smell</h3>
            <EditableMetric label="Sensitivity (1-10)" value={data.senses.smell.sensitivity} onChange={v => updateSense('smell', 'sensitivity', v)} />
            <EditableMetric label="Issues" value={data.senses.smell.issues} onChange={v => updateSense('smell', 'issues', v)} type="text" />
          </div>
          <div className="sense-card">
            <h3>👅 Taste</h3>
            <EditableMetric label="Sensitivity (1-10)" value={data.senses.taste.sensitivity} onChange={v => updateSense('taste', 'sensitivity', v)} />
            <EditableMetric label="Issues" value={data.senses.taste.issues} onChange={v => updateSense('taste', 'issues', v)} type="text" />
          </div>
          <div className="sense-card">
            <h3>✋ Touch</h3>
            <EditableMetric label="Sensitivity (1-10)" value={data.senses.touch.sensitivity} onChange={v => updateSense('touch', 'sensitivity', v)} />
            <EditableMetric label="Numbness" value={data.senses.touch.numbness} onChange={v => updateSense('touch', 'numbness', v)} type="text" />
          </div>
        </div>
      </section>

      {/* Diet & Nutrition */}
      <section className="he-section">
        <h2 className="section-title">🍽️ Diet & Nutrition</h2>
        <div className="diet-grid">
          <EditableMetric label="Calories" value={data.diet.calories} onChange={v => updateDiet('calories', v)} unit="kcal" />
          <EditableMetric label="Protein" value={data.diet.protein} onChange={v => updateDiet('protein', v)} unit="g" />
          <EditableMetric label="Carbs" value={data.diet.carbs} onChange={v => updateDiet('carbs', v)} unit="g" />
          <EditableMetric label="Fats" value={data.diet.fats} onChange={v => updateDiet('fats', v)} unit="g" />
          <EditableMetric label="Water" value={data.diet.water} onChange={v => updateDiet('water', v)} unit="L" />
        </div>
      </section>

      {/* Exercise Library */}
      <section className="he-section">
        <h2 className="section-title">💪 Exercise Library</h2>
        <div className="exercises-list">
          {data.exercises.map((ex, i) => (
            <div key={i} className="exercise-card">
              <EditableMetric label="Exercise" value={ex.name} onChange={v => updateExercise(i, 'name', v)} type="text" />
              <div className="exercise-metrics">
                <EditableMetric label="Sets" value={ex.sets} onChange={v => updateExercise(i, 'sets', v)} />
                <EditableMetric label="Reps" value={ex.reps} onChange={v => updateExercise(i, 'reps', v)} />
                <EditableMetric label="Weight" value={ex.weight} onChange={v => updateExercise(i, 'weight', v)} unit="kg" />
              </div>
            </div>
          ))}
          <button className="add-btn" onClick={addExercise}>+ Add Exercise</button>
        </div>
      </section>

      {/* Bronco Test */}
      <section className="he-section">
        <h2 className="section-title">🏃 Bronco/Beep Test</h2>
        <div className="bronco-grid">
          <EditableMetric label="Level Achieved" value={data.broncoTest.level} onChange={v => setData(p => ({ ...p, broncoTest: { ...p.broncoTest, level: v } }))} />
          <EditableMetric label="VO2 Max" value={data.broncoTest.vo2max} onChange={v => setData(p => ({ ...p, broncoTest: { ...p.broncoTest, vo2max: v } }))} unit="ml/kg/min" />
          <EditableMetric label="Test Date" value={data.broncoTest.date} onChange={v => setData(p => ({ ...p, broncoTest: { ...p.broncoTest, date: v } }))} type="date" />
          <EditableMetric label="Score" value={data.broncoTest.score} onChange={v => setData(p => ({ ...p, broncoTest: { ...p.broncoTest, score: v } }))} type="text" />
        </div>
      </section>

      {/* Posture Tracking */}
      <section className="he-section">
        <h2 className="section-title">🧘 Posture Check</h2>
        <div className="posture-grid">
          <EditableMetric label="Neck" value={data.posture.neck} onChange={v => setData(p => ({ ...p, posture: { ...p.posture, neck: v } }))} type="text" />
          <EditableMetric label="Back" value={data.posture.back} onChange={v => setData(p => ({ ...p, posture: { ...p.posture, back: v } }))} type="text" />
          <EditableMetric label="Shoulders" value={data.posture.shoulders} onChange={v => setData(p => ({ ...p, posture: { ...p.posture, shoulders: v } }))} type="text" />
          <EditableMetric label="Last Check" value={data.posture.lastCheck} onChange={v => setData(p => ({ ...p, posture: { ...p.posture, lastCheck: v } }))} type="date" />
        </div>
      </section>

      {/* Hobby Tracker */}
      <section className="he-section">
        <h2 className="section-title">🎨 Hobby Tracker</h2>
        <div className="hobbies-list">
          {data.hobbies.map((hobby, i) => (
            <div key={i} className="hobby-card">
              <EditableMetric label="Hobby" value={hobby.name} onChange={v => setData(p => ({ ...p, hobbies: p.hobbies.map((h, idx) => idx === i ? { ...h, name: v } : h) }))} type="text" />
              <EditableMetric label="Hours/Week" value={hobby.hours} onChange={v => setData(p => ({ ...p, hobbies: p.hobbies.map((h, idx) => idx === i ? { ...h, hours: v } : h) }))} />
              <EditableMetric label="Progress" value={hobby.progress} onChange={v => setData(p => ({ ...p, hobbies: p.hobbies.map((h, idx) => idx === i ? { ...h, progress: v } : h) }))} type="text" />
            </div>
          ))}
          <button className="add-btn" onClick={addHobby}>+ Add Hobby</button>
        </div>
      </section>
    </div>
  );
};

export default HealthExtras;
