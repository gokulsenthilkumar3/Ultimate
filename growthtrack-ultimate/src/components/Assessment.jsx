import React, { useState, useEffect, useCallback } from 'react';
import useStore, { selectAssessmentQA, apiSync } from '../store/useStore';
import { ChevronDown, ChevronUp, Search, ClipboardList, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const FALLBACK_QUESTIONS = [
  { key: 'current_weight',    label: 'Current Weight',          placeholder: 'e.g. 72 kg' },
  { key: 'target_weight',     label: 'Target Weight',           placeholder: 'e.g. 80 kg' },
  { key: 'height',            label: 'Height',                  placeholder: 'e.g. 175 cm' },
  { key: 'activity_level',    label: 'Activity Level',          placeholder: 'Sedentary / Lightly active / Active / Very active' },
  { key: 'diet_preference',   label: 'Diet Preference',         placeholder: 'Veg / Non-veg / Vegan' },
  { key: 'sleep_hours',       label: 'Average Sleep Hours',     placeholder: 'e.g. 7' },
  { key: 'workout_days',      label: 'Workout Days per Week',   placeholder: 'e.g. 4' },
  { key: 'main_goal',         label: 'Main Health Goal',        placeholder: 'e.g. Build muscle, Lose fat, Improve endurance' },
  { key: 'health_conditions', label: 'Any Health Conditions',   placeholder: 'e.g. None, Knee pain, Hypertension' },
  { key: 'motivation',        label: 'What motivates you?',     placeholder: 'e.g. Sports, Aesthetics, Health' },
];

export default function Assessment({ user }) {
  const assessmentQA  = useStore(selectAssessmentQA) || [];
  const saveAssessment = useStore(s => s.saveAssessmentQA);
  const toast = useToast();

  const [questions, setQuestions] = useState(FALLBACK_QUESTIONS);
  const [view, setView]   = useState('history');
  const [step, setStep]   = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch questions from DB
  useEffect(() => {
    apiSync('/assessment_questions', 'GET')
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data);
        }
      })
      .catch(() => { /* keep fallback */ });
  }, []);


  // ── History search
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [searchTerm, setSearchTerm]       = useState('');

  // ── Hydrate form answers from DB on mount ── match by key, not label
  useEffect(() => {
    if (!assessmentQA?.length) return;
    const latest = assessmentQA[assessmentQA.length - 1];
    if (!latest?.items?.length) return;
    const hydrated = {};
    latest.items.forEach(item => {
      // Primary: match by stored key field
      if (item.key) {
        hydrated[item.key] = item.a;
      } else {
        // Legacy fallback: match by label text
        const match = questions.find(q => q.label.toLowerCase() === item.q?.toLowerCase());
        if (match) hydrated[match.key] = item.a;
      }
    });
    if (Object.keys(hydrated).length > 0) setAnswers(hydrated);
  }, [assessmentQA, questions]);

  const current = questions[step];
  const totalSteps = questions.length;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  const handleNext = () => {
    if (!answers[current.key]?.trim()) {
      toast.error('Please answer this question before continuing.');
      return;
    }
    if (step < totalSteps - 1) setStep(s => s + 1);
  };

  const handleSubmitForm = useCallback(async () => {
    const unanswered = questions.filter(q => !answers[q.key]?.trim());
    if (unanswered.length > 0) {
      toast.error(`Please answer: ${unanswered[0].label}`);
      setStep(questions.indexOf(unanswered[0]));
      return;
    }
    setSubmitting(true);
    try {
      const round = {
        round: `Assessment — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        color: 'var(--accent)',
        items: questions.map(q => ({ q: q.label, a: answers[q.key] || '—' })),
      };
      if (typeof saveAssessment === 'function') {
        await saveAssessment(round);
      } else {
        // Fallback: POST directly
        await fetch('/api/assessment_qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(round),
        });
      }
      toast.success('Assessment saved!');
      setView('history');
      setStep(0);
    } catch (e) {
      toast.error('Failed to save assessment.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, saveAssessment, toast, questions]);

  const filtered = searchTerm
    ? assessmentQA.filter(r => r.round.toLowerCase().includes(searchTerm.toLowerCase()) || r.items.some(i => i.q.toLowerCase().includes(searchTerm.toLowerCase()) || i.a.toLowerCase().includes(searchTerm.toLowerCase())))
    : assessmentQA;

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <p className="label-caps" style={{ marginBottom: '0.35rem', color: 'var(--accent)' }}>Assessment</p>
          <h2 className="text-display" style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>
            <ClipboardList size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />
            Health Assessment
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Diagnostic rounds · {assessmentQA.length} record{assessmentQA.length !== 1 ? 's' : ''} saved.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {view === 'history' && (
            <>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input type="text" placeholder="Search records..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="form-input" style={{ paddingLeft: '36px', minWidth: '200px' }} />
              </div>
              <button className="btn-primary" onClick={() => { setView('form'); setStep(0); }}>
                <ClipboardList size={14} /> New Assessment
              </button>
            </>
          )}
          {view === 'form' && (
            <button className="btn-secondary" onClick={() => setView('history')}>← Back to History</button>
          )}
        </div>
      </div>

      {/* ── QA FORM (Stepper) */}
      {view === 'form' && (
        <div className="glass-card" style={{ padding: '2rem', maxWidth: '560px', margin: '0 auto' }}>
          {/* Step dot strip — click any answered dot to jump */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {questions.map((q, i) => {
              const answered = !!answers[q.key]?.trim();
              const isCurrent = i === step;
              return (
                <button
                  key={q.key}
                  title={q.label}
                  onClick={() => setStep(i)}
                  style={{
                    width: isCurrent ? '20px' : '8px', height: '8px', borderRadius: '99px',
                    background: isCurrent ? 'var(--accent)' : answered ? 'rgba(16,185,129,0.7)' : 'var(--bg-elevated)',
                    border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--border)',
                    transition: 'all 0.2s', cursor: 'pointer', padding: 0, flexShrink: 0,
                  }}
                />
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="label-caps" style={{ fontSize: '0.65rem' }}>Question {step + 1} of {totalSteps}</span>
              <span className="label-caps" style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>{progress}% complete</span>
            </div>
            <div style={{ height: '4px', background: 'var(--bg-dark)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.35s ease' }} />
            </div>
          </div>

          {/* Question card */}
          <div style={{ minHeight: '120px', marginBottom: '2rem' }}>
            <p className="label-caps" style={{ color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '0.65rem' }}>Q{step + 1}</p>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '1.25rem' }}>{current.label}</h3>
            <input
              className="form-input"
              placeholder={current.placeholder}
              value={answers[current.key] || ''}
              onChange={e => setAnswers(a => ({ ...a, [current.key]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') step < totalSteps - 1 ? handleNext() : handleSubmitForm(); }}
              autoFocus
              style={{ fontSize: '1rem', padding: '0.75rem 1rem' }}
            />
          </div>

          {/* Navigation */}
          <div className="flex-between">
            <button
              className="btn-secondary"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              style={{ opacity: step === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={14} /> Back
            </button>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {QA_FORM_QUESTIONS.map((_, i) => (
                <div key={i} onClick={() => setStep(i)} style={{
                  width: i === step ? '20px' : '7px',
                  height: '7px',
                  borderRadius: '4px',
                  background: answers[QA_FORM_QUESTIONS[i].key] ? '#10b981' : i === step ? 'var(--accent)' : 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }} />
              ))}
            </div>

            {step < totalSteps - 1 ? (
              <button className="btn-primary" onClick={handleNext}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button className="btn-primary" onClick={handleSubmitForm} disabled={submitting}
                style={{ background: '#10b981', opacity: submitting ? 0.6 : 1 }}>
                <CheckCircle size={14} /> {submitting ? 'Saving…' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY VIEW */}
      {view === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
              <ClipboardList size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ fontSize: '0.88rem' }}>
                {assessmentQA.length === 0 ? 'No assessments yet. Click "New Assessment" to start.' : 'No results match your search.'}
              </p>
            </div>
          )}
          {filtered.map((round, idx) => (
            <div key={idx} className="glass-card" style={{ padding: 0, borderColor: expandedIndex === idx ? 'var(--border-strong)' : 'var(--border)' }}>
              <button onClick={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '1.15rem 1.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: (round.color || 'var(--accent)') + '18', color: round.color || 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.78rem', fontWeight: 800, border: `1px solid ${(round.color || 'var(--accent)')}33`,
                    flexShrink: 0,
                  }}>{idx + 1}</div>
                  <div>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: expandedIndex === idx ? 'var(--text-1)' : 'var(--text-2)' }}>{round.round}</h3>
                    <p className="label-caps" style={{ fontSize: '0.58rem', marginTop: '2px' }}>{round.items?.length || 0} Data Points</p>
                  </div>
                </div>
                {expandedIndex === idx ? <ChevronUp size={18} color="var(--text-3)" /> : <ChevronDown size={18} color="var(--text-3)" />}
              </button>
              {expandedIndex === idx && (
                <div style={{ padding: '0 1.35rem 1.35rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginTop: '1rem' }}>
                    {round.items?.map((item, i) => (
                      <div key={i} style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <p className="label-caps" style={{ color: round.color || 'var(--accent)', marginBottom: '0.25rem' }}>Question</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-1)', marginBottom: '0.65rem', fontWeight: 500 }}>{item.q}</p>
                        <p className="label-caps" style={{ marginBottom: '0.2rem' }}>Response</p>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-1)', fontWeight: 700 }}>{item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
