import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/ProfileContext';
import { Calculator } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { formData, questionLabels } from '../lib/crsData';
import FloatingScoreCard from '../components/FloatingScoreCard';

export default function CanadaCRSCalculator({ session }) {
  const { refetch } = useProfile();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Deduplicate questions just like the HTML does
  const uniqueQuestions = [];
  const seen = new Set();
  for (let item of formData) {
    if (!seen.has(item.question)) {
      seen.add(item.question);
      uniqueQuestions.push(item);
    }
  }

  // Initialize form state
  const initialFormState = {};
  uniqueQuestions.forEach(q => {
    initialFormState[q.question] = '';
  });
  
  const [formState, setFormState] = useState(initialFormState);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    // Load existing data
    const loadData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('points_canada_crs')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (data) {
        const loadedState = { ...initialFormState };
        uniqueQuestions.forEach(q => {
          // the database column might be named slightly differently if it has hyphens
          const colName = q.question.replace('-', '_');
          if (data[colName]) {
            loadedState[q.question] = data[colName];
          }
        });
        setFormState(loadedState);
      }
      setLoading(false);
    };

    if (session?.user?.id) {
      loadData();
    }
  }, [session]);

  useEffect(() => {
    // Calculate total points
    let total = 0;
    
    for (let key in formState) {
      const value = formState[key];
      if (value && value.length > 0) {
        let mockScore = (value.charCodeAt(0) - 64) * 10;
        if (mockScore > 0 && mockScore < 300) {
          total += mockScore;
        }
      }
    }
    
    total = Math.min(total, 1200);
    setTotalPoints(total);
  }, [formState]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      user_id: session.user.id,
      total_points: totalPoints,
      updated_at: new Date().toISOString()
    };
    
    uniqueQuestions.forEach(q => {
      const colName = q.question.replace('-', '_');
      payload[colName] = formState[q.question] || null;
    });

    try {
      const { data: existing } = await supabase
        .from('points_canada_crs')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('points_canada_crs').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('points_canada_crs').insert([payload]);
      }
      
      if (refetch) refetch();
      alert('Your CRS points have been saved successfully!');
    } catch (error) {
      console.error('Error saving CRS points:', error);
      alert('Error saving data.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (question, value) => {
    setFormState(prev => ({ ...prev, [question]: value }));
  };

  if (loading) {
    return <div className="p-4 text-center">Loading your data...</div>;
  }

  return (
    <>
      <PageHeader title="Canada CRS Calculator" icon={Calculator} backTo="/forms" backLabel="Back to Forms" />
      
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '120px' }}>
        <p className="subtitle" style={{ textAlign: 'center', color: 'var(--color-secondary)', marginBottom: '2rem' }}>
          Calculate your Express Entry CRS score (Mock Calculation)
        </p>

        <form onSubmit={handleSave} className="card p-4">
          {uniqueQuestions.map((section, idx) => (
            <div key={section.question} className="form-group mb-4 pb-4" style={{ borderBottom: idx < uniqueQuestions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.15rem' }}>
                {questionLabels[section.question] || `Question: ${section.question}`}
              </h3>
              
              {section.options.length > 5 ? (
                <select 
                  className="input" 
                  value={formState[section.question]} 
                  onChange={(e) => handleChange(section.question, e.target.value)}
                >
                  <option value="">Select an option...</option>
                  {section.options.map((opt, i) => (
                    <option key={i} value={opt.points_or_value}>{opt.text}</option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {section.options.map((opt, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: formState[section.question] === opt.points_or_value ? 'var(--color-muted)' : 'transparent' }}>
                      <input 
                        type="radio" 
                        name={section.question} 
                        value={opt.points_or_value} 
                        checked={formState[section.question] === opt.points_or_value}
                        onChange={() => handleChange(section.question, opt.points_or_value)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
                      />
                      <span style={{ fontWeight: 500 }}>{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save CRS Details'}
            </button>
          </div>
        </form>

        <FloatingScoreCard
            title="Estimated CRS Score"
            subtitle="Note: Requires IRCC CRS mapping logic for accurate score."
            score={totalPoints}
            maxWidth="900px"
        />
      </div>
    </>
  );
}
