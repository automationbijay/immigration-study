import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Briefcase, Building, Activity, Save, Award, ShieldCheck } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProfessionDetails({ anzscoCode, jobName, onSave, saving }) {
  const [lists, setLists] = useState([]);
  const [visas, setVisas] = useState([]);
  const [assessingAuthority, setAssessingAuthority] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!anzscoCode) return;
      setLoading(true);

      try {
        const codeInt = parseInt(anzscoCode, 10);
        
        // 1. Check which lists this occupation belongs to
        const listsFound = [];
        let authority = '';
        let sLevel = '';
        
        const [mltssl, stsol, rol, csol] = await Promise.all([
          supabase.from('anzsco_mltssl').select('*').eq('anzsco_code', codeInt).maybeSingle(),
          supabase.from('anzsco_stsol').select('*').eq('anzsco_code', codeInt).maybeSingle(),
          supabase.from('anzsco_rol').select('*').eq('anzsco_code', codeInt).maybeSingle(),
          supabase.from('anzsco_csol').select('*').eq('anzsco_code', codeInt).maybeSingle()
        ]);
        
        if (mltssl.data) {
          listsFound.push('MLTSSL');
          authority = authority || mltssl.data.assessing_authority;
          sLevel = sLevel || mltssl.data.skill_level;
        }
        if (stsol.data) {
          listsFound.push('STSOL');
          authority = authority || stsol.data.assessing_authority;
          sLevel = sLevel || stsol.data.skill_level;
        }
        if (rol.data) {
          listsFound.push('ROL');
          authority = authority || rol.data.assessing_authority;
          sLevel = sLevel || rol.data.skill_level;
        }
        if (csol.data) {
          listsFound.push('CSOL');
          sLevel = sLevel || csol.data.skill_level;
        }
        
        setLists(listsFound);
        setAssessingAuthority(authority);
        setSkillLevel(sLevel);

        // 2. Fetch supported visas based on the lists
        if (listsFound.length > 0) {
          const { data: visaData } = await supabase
            .from('anzsco_visa_federal')
            .select('*')
            .in('list_code', listsFound);
            
          if (visaData) {
            // Deduplicate visas by subclass
            const uniqueVisas = [];
            const seen = new Set();
            for (const v of visaData) {
              if (!seen.has(v.visa_subclass)) {
                seen.add(v.visa_subclass);
                uniqueVisas.push(v);
              }
            }
            // Sort by subclass numerically
            uniqueVisas.sort((a, b) => parseInt(a.visa_subclass, 10) - parseInt(b.visa_subclass, 10));
            setVisas(uniqueVisas);
          }
        } else {
          setVisas([]);
        }

        // 3. Fetch EOI tracker data for historical points (SC189 for instance)
        const { data: trackerData } = await supabase
          .from('scr_myimmitracker_expression_of_interest_sc189_tracker')
          .select('points, eoi_date_of_effect, invited, status')
          .eq('anzsco_code', anzscoCode.toString())
          .in('status', ['Invited', 'Granted'])
          .not('invited', 'is', null)
          .order('invited', { ascending: true });

        // Aggregate points data by month for charting
        let aggregatedPoints = [];
        if (trackerData && trackerData.length > 0) {
          const pointsByDate = {};
          trackerData.forEach(entry => {
            if (entry.invited) {
              const date = new Date(entry.invited);
              const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              if (!pointsByDate[monthYear] || pointsByDate[monthYear] > entry.points) {
                // Approximate lowest points that got invited as the cut-off
                pointsByDate[monthYear] = entry.points;
              }
            }
          });
          aggregatedPoints = Object.keys(pointsByDate).sort().map(key => ({
            date: key,
            points: pointsByDate[key]
          }));
        }

        setPointsHistory(aggregatedPoints);
      } catch (err) {
        console.error("Error fetching profession details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [anzscoCode]);

  if (loading) {
    return (
      <div className="anz-details" role="status" aria-busy="true">
        <span className="visually-hidden">Loading profession details</span>
        <Skeleton height="9rem" radius="var(--radius-xl)" />
        <Skeleton height="10rem" radius="var(--radius-xl)" />
        <Skeleton height="14rem" radius="var(--radius-xl)" />
      </div>
    );
  }

  return (
    <div className="anz-details">
      {/* Header: occupation identity, list membership, and the save action. */}
      <header className="anz-hero">
        <div className="anz-hero-main">
          <span className="anz-eyebrow">
            <Briefcase size={14} aria-hidden="true" /> ANZSCO {anzscoCode}
          </span>
          <h2 className="anz-hero-title">{jobName}</h2>
          <div className="anz-pills">
            {lists.length > 0 ? lists.map(list => (
              <span key={list} className="anz-pill">{list}</span>
            )) : (
              <span className="anz-pill anz-pill-muted">Not on any skilled list</span>
            )}
          </div>
        </div>
        {onSave && (
          <button
            type="button"
            className="btn-primary btn-compact anz-save"
            onClick={onSave}
            disabled={saving}
          >
            <Save size={18} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save to profile'}
          </button>
        )}
      </header>

      {/* Quick facts */}
      <dl className="anz-facts">
        <div className="anz-fact">
          <dt><Building size={16} aria-hidden="true" /> Assessing authority</dt>
          <dd>{assessingAuthority || 'Not specified'}</dd>
        </div>
        <div className="anz-fact">
          <dt><Award size={16} aria-hidden="true" /> Skill level</dt>
          <dd>{skillLevel || 'N/A'}</dd>
        </div>
        <div className="anz-fact">
          <dt><ShieldCheck size={16} aria-hidden="true" /> Eligible visas</dt>
          <dd>{visas.length}</dd>
        </div>
      </dl>

      {/* Visas */}
      <section className="anz-block">
        <h3 className="section-title anz-block-title">Supported federal visas</h3>
        {visas.length > 0 ? (
          <div className="anz-visa-grid">
            {visas.map(visa => (
              <article key={visa.visa_subclass} className="anz-visa">
                <div className="anz-visa-head">
                  <span className="anz-visa-subclass">{visa.visa_subclass}</span>
                  <span className={`anz-visa-type ${visa.residency_type === 'Permanent' ? 'is-permanent' : ''}`}>
                    {visa.residency_type || 'Unknown'}
                  </span>
                </div>
                <h4 className="anz-visa-name">{visa.visa_name || `Subclass ${visa.visa_subclass}`}</h4>
                <p className="anz-visa-desc">
                  {visa.residency_description || 'Federal skilled migration visa.'}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state anz-empty">
            No supported federal visas found for this occupation.
          </div>
        )}
      </section>

      {/* History */}
      <section className="anz-block">
        <h3 className="section-title anz-block-title">
          <Activity size={20} aria-hidden="true" /> Historical cut-off points
          <span className="anz-block-tag">Subclass 189</span>
        </h3>
        {pointsHistory.length > 0 ? (
          <div className="card anz-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pointsHistory} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddcdb0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#4e5666' }}
                  axisLine={{ stroke: '#ddcdb0' }}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tick={{ fontSize: 12, fill: '#4e5666' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #ddcdb0', background: '#fbf6ec', color: '#142036' }}
                />
                <Line
                  type="monotone"
                  dataKey="points"
                  stroke="#c4612b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#c4612b', strokeWidth: 2, stroke: '#fbf6ec' }}
                  activeDot={{ r: 6, fill: '#9c4416', stroke: '#fbf6ec', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state anz-empty">
            No historical invitation data available yet.
          </div>
        )}
      </section>
    </div>
  );
}
