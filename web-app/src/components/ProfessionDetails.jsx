import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Briefcase, Building, Activity, CheckCircle, Save, Award, Map, Navigation, ShieldCheck } from 'lucide-react';
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
    return <div className="text-center py-8 text-gray-500">Loading profession details...</div>;
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{jobName}</h2>
              <p className="text-gray-500 flex items-center mt-1 text-sm font-medium">
                <Briefcase className="w-4 h-4 mr-2" /> ANZSCO Code: {anzscoCode}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lists.map(list => (
                <span key={list} className="px-3 py-1 bg-blue-100 text-blue-800 font-semibold rounded-full text-xs tracking-wider">
                  {list}
                </span>
              ))}
              {lists.length === 0 && (
                <span className="px-3 py-1 bg-gray-100 text-gray-500 font-semibold rounded-full text-xs">
                  Not on any Skilled List
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-8">
          {/* Visa Types - Full Width Row */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center mb-4">
              <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" /> Supported Federal Visas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {console.log('Rendering Visas:', visas)}
              {visas && visas.length > 0 ? visas.map(visa => (
                <div 
                  key={visa.visa_subclass || Math.random()} 
                  className="group relative flex flex-col justify-between bg-white border border-gray-200 hover:border-emerald-400 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden min-h-[160px]"
                >
                  {/* Decorative background accent */}
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-full opacity-40 group-hover:scale-150 transition-transform duration-500"></div>
                  
                  <div className="relative z-10 flex justify-between items-start mb-5">
                    <div className="bg-emerald-50 text-emerald-700 font-black text-2xl px-4 py-2 rounded-xl border border-emerald-200 shadow-sm">
                      {visa.visa_subclass}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${visa.residency_type === 'Permanent' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                      {visa.residency_type || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="relative z-10">
                    <h4 className="font-semibold text-gray-900 leading-tight mb-2 text-lg">
                      {visa.visa_name || `Subclass ${visa.visa_subclass}`}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {visa.residency_description || 'Federal skilled migration visa.'}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="col-span-full h-32 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                  No supported federal visas found for this occupation.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assessment Authority */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center mb-4">
                <Building className="w-4 h-4 mr-2 text-indigo-500" /> Skills Assessment
              </h3>
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 shadow-sm">
                <p className="text-sm text-indigo-900 flex justify-between items-center mb-3">
                  <span className="font-medium text-indigo-700">Assessing Authority</span>
                  <span className="font-bold text-right text-base">{assessingAuthority || 'Not Specified'}</span>
                </p>
                <div className="w-full h-px bg-indigo-100/80 my-3" />
                <p className="text-sm text-indigo-900 flex justify-between items-center">
                  <span className="font-medium text-indigo-700">Skill Level</span>
                  <span className="font-bold text-base">{skillLevel || 'N/A'}</span>
                </p>
              </div>
            </div>

            {/* Historical Data */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center mb-4">
                <Activity className="w-4 h-4 mr-2 text-purple-500" /> Historical Cut-off Points (SC189)
              </h3>
              {pointsHistory.length > 0 ? (
                <div className="h-64 w-full bg-white border border-gray-100 rounded-xl p-4 pt-6 shadow-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pointsHistory}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{fontSize: 12, fill: '#888'}} 
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis 
                        domain={['dataMin - 5', 'dataMax + 5']} 
                        tick={{fontSize: 12, fill: '#888'}} 
                        axisLine={false} 
                        tickLine={false}
                        width={30}
                      />
                      <Tooltip 
                        contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'}}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="points" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 w-full bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                  No historical invitation data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        {onSave && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button 
              className="btn-primary w-full md:w-auto flex justify-center items-center gap-2"
              onClick={onSave} 
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save to Profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
