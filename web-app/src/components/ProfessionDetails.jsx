import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Briefcase, Building, Activity, Save, Award, ShieldCheck, ChevronDown } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Link } from 'react-router-dom';
import { useProfile } from '../lib/ProfileContext';

// Subclass 491 adds 15 points for state or family nomination; 189 adds none.
const NOMINATION_491 = 15;

export default function ProfessionDetails({ anzscoCode, jobName, onSave, saving }) {
  const [lists, setLists] = useState([]);
  const [visas, setVisas] = useState([]);
  const [assessingAuthority, setAssessingAuthority] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [pointsHistory, setPointsHistory] = useState([]);
  const [historyError, setHistoryError] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { profileRow, totalPoints } = useProfile();
  // Base points exclude nomination, so 491 gets its bonus here.
  const userPoints = profileRow && totalPoints > 0
    ? { sc189: totalPoints, sc491: totalPoints + NOMINATION_491 }
    : null;

  useEffect(() => {
    const request = new AbortController();
    const { signal } = request;

    async function loadData() {
      if (!anzscoCode) return;
      setLoading(true);
      setDetailsError(false);

      try {
        const codeInt = parseInt(anzscoCode, 10);

        // 1. Check which lists this occupation belongs to
        const listsFound = [];
        let authority = '';
        let sLevel = '';

        const [mltssl, stsol, rol, csol, history] = await Promise.all([
          supabase.from('anzsco_mltssl').select('*').eq('anzsco_code', codeInt).abortSignal(signal).maybeSingle(),
          supabase.from('anzsco_stsol').select('*').eq('anzsco_code', codeInt).abortSignal(signal).maybeSingle(),
          supabase.from('anzsco_rol').select('*').eq('anzsco_code', codeInt).abortSignal(signal).maybeSingle(),
          supabase.from('anzsco_csol').select('*').eq('anzsco_code', codeInt).abortSignal(signal).maybeSingle(),
          supabase.rpc('get_skillselect_cutoffs', { p_anzsco_code: codeInt }).abortSignal(signal),
        ]);
        if (signal.aborted) return;

        setHistoryError(Boolean(history.error));
        setPointsHistory((history.data ?? []).map(row => ({
          date: row.round_date,
          sc189: row.subclass_189_points,
          sc491: row.subclass_491_points,
        })));

        const listError = [mltssl, stsol, rol, csol].find(result => result.error);
        if (listError) throw listError.error;

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
          const { data: visaData, error: visaError } = await supabase
            .from('anzsco_visa_federal')
            .select('*')
            .in('list_code', listsFound)
            .abortSignal(signal);
          if (signal.aborted) return;
          if (visaError) throw visaError;

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

      } catch (err) {
        if (signal.aborted) return;
        setDetailsError(true);
        console.error("Error fetching profession details:", err);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    loadData();
    return () => request.abort();
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
            <span className="anz-pill anz-pill-muted">{detailsError ? 'Skilled lists unavailable' : 'Not on any skilled list'}</span>
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
          <dd>{assessingAuthority || (detailsError ? 'Unavailable' : 'Not specified')}</dd>
        </div>
        <div className="anz-fact">
          <dt><Award size={16} aria-hidden="true" /> Skill level</dt>
          <dd>{skillLevel || (detailsError ? 'Unavailable' : 'N/A')}</dd>
        </div>
        <div className="anz-fact">
          <dt><ShieldCheck size={16} aria-hidden="true" /> Eligible visas</dt>
          <dd>{detailsError ? 'Unavailable' : visas.length}</dd>
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
            {detailsError ? 'Supported federal visas could not be loaded.' : 'No supported federal visas found for this occupation.'}
          </div>
        )}
      </section>

      {/* History: SkillSelect invitation round cut-offs */}
      <section className="anz-block">
        <h3 className="section-title anz-block-title">
          <Activity size={20} aria-hidden="true" /> Historical cut-off points
          <span className="anz-block-tag">189 &amp; family-sponsored 491</span>
        </h3>
        {historyError ? (
          <div className="empty-state anz-empty" role="status">
            SkillSelect cut-off points could not be loaded.
          </div>
        ) : pointsHistory.length > 0 ? (
          <>
            <dl className="anz-cutoff-latest">
              <CutoffStat label="Latest 189 cut-off" rows={pointsHistory} field="sc189" you={userPoints?.sc189} />
              <CutoffStat label="Latest 491 cut-off" rows={pointsHistory} field="sc491" you={userPoints?.sc491} />
            </dl>
            {!userPoints && (
              <p className="anz-you-prompt">
                <Link to="/australia-point-calculator">Calculate your points</Link> to see how you compare.
              </p>
            )}
            <div className="card anz-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pointsHistory} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddcdb0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatRound}
                    tick={{ fontSize: 12, fill: '#4e5666' }}
                    axisLine={{ stroke: '#ddcdb0' }}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    domain={chartDomain(pointsHistory, userPoints)}
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#4e5666' }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  {userPoints && (
                    <ReferenceLine
                      y={userPoints.sc189}
                      stroke="#142036"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      ifOverflow="extendDomain"
                      label={{ value: `You · 189: ${userPoints.sc189}`, position: 'insideTopLeft', fill: '#142036', fontSize: 12, fontWeight: 600 }}
                    />
                  )}
                  {userPoints && pointsHistory.some(r => r.sc491 != null) && (
                    <ReferenceLine
                      y={userPoints.sc491}
                      stroke="#3e5133"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      ifOverflow="extendDomain"
                      label={{ value: `You · 491: ${userPoints.sc491}`, position: 'insideBottomLeft', fill: '#3e5133', fontSize: 12, fontWeight: 600 }}
                    />
                  )}
                  <Tooltip
                    labelFormatter={formatRoundLong}
                    formatter={(value, name) => [`${value} points`, name]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #ddcdb0', background: '#fbf6ec', color: '#142036' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="sc189"
                    name="Subclass 189"
                    stroke="#c4612b"
                    strokeWidth={3}
                    isAnimationActive={false}
                    dot={{ r: 4, fill: '#c4612b', strokeWidth: 2, stroke: '#fbf6ec' }}
                    activeDot={{ r: 6, fill: '#9c4416', stroke: '#fbf6ec', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sc491"
                    name="Subclass 491"
                    stroke="#56684a"
                    strokeWidth={3}
                    isAnimationActive={false}
                    dot={{ r: 4, fill: '#56684a', strokeWidth: 2, stroke: '#fbf6ec' }}
                    activeDot={{ r: 6, fill: '#3e5133', stroke: '#fbf6ec', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <details className="anz-cutoff-table">
              <summary>
                <span className="anz-cutoff-summary-label">View cut-off points by round</span>
                <span className="anz-cutoff-count">
                  {pointsHistory.length} {pointsHistory.length === 1 ? 'round' : 'rounds'}
                </span>
                <ChevronDown size={18} className="anz-cutoff-chevron" aria-hidden="true" />
              </summary>
              <div className="anz-cutoff-scroll">
                <table aria-label="SkillSelect cut-off points by invitation round">
                  <thead>
                    <tr>
                      <th scope="col">Invitation round</th>
                      <th scope="col" className="is-num"><span className="anz-cutoff-long">Subclass </span>189</th>
                      <th scope="col" className="is-num"><span className="anz-cutoff-long">Subclass </span>491</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointsHistory.toReversed().map((row, i) => (
                      <tr key={row.date}>
                        <th scope="row">
                          {formatRoundLong(row.date)}
                          {i === 0 && <span className="anz-cutoff-latest-tag">Latest</span>}
                        </th>
                        <td className="is-num"><CutoffCell value={row.sc189} kind="sc189" /></td>
                        <td className="is-num"><CutoffCell value={row.sc491} kind="sc491" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="anz-source">
              Minimum points invited in each SkillSelect round. Source: Department of Home Affairs.
            </p>
          </>
        ) : (
          <div className="empty-state anz-empty">
            No published SkillSelect cut-off points found for this occupation.
          </div>
        )}
      </section>
    </div>
  );
}

const shortRound = new Intl.DateTimeFormat('en-AU', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const fullRound = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function formatRound(iso) {
  return shortRound.format(new Date(iso));
}

function formatRoundLong(iso) {
  return fullRound.format(new Date(iso));
}

function CutoffStat({ label, rows, field, you }) {
  const latest = rows.findLast(row => row[field] != null);
  const gap = latest && you != null ? you - latest[field] : null;
  return (
    <div className="anz-fact">
      <dt>{label}</dt>
      <dd>
        {latest ? latest[field] : '—'}
        {latest && <span className="anz-fact-sub">{formatRoundLong(latest.date)}</span>}
        {gap != null && (
          <span className={`anz-you ${gap >= 0 ? 'is-met' : 'is-short'}`}>
            Your estimate: {you} · {gap === 0 ? 'matches cutoff' : gap > 0 ? `${gap} above` : `${-gap} below`}
          </span>
        )}
      </dd>
    </div>
  );
}

// Y range covering every cut-off plus the user's own scores, snapped to 5s.
function chartDomain(rows, you) {
  const values = rows.flatMap(r => [r.sc189, r.sc491]).filter(v => v != null);
  if (you) {
    values.push(you.sc189);
    if (rows.some(r => r.sc491 != null)) values.push(you.sc491);
  }
  const min = Math.floor((Math.min(...values) - 5) / 5) * 5;
  const max = Math.ceil((Math.max(...values) + 5) / 5) * 5;
  return [Math.max(0, min), max];
}

function CutoffCell({ value, kind }) {
  if (value == null) return <span className="anz-cutoff-none" aria-label="No published cutoff">—</span>;
  return <span className={`anz-cutoff-pill is-${kind}`}>{value}</span>;
}
