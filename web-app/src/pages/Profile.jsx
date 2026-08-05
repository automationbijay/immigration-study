import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Globe, GraduationCap, Briefcase, CheckCircle2 } from 'lucide-react';

export default function Profile({ session }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    age: 25,
    country: 'India',
    english: 0,
    overseasExp: 0,
    ausExp: 0,
    education: 0,
    specialistEdu: false,
    ausStudy: false,
    professionalYear: false,
    ccl: false,
    regionalStudy: false,
    partnerSkills: 0,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    let ignore = false;
    async function getProfile() {
      setLoading(true);
      const { user } = session;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!ignore) {
        if (data) {
          setProfile(prev => ({ ...prev, ...data }));
        }
        setLoading(false);
      }
    }

    getProfile();
    return () => { ignore = true; };
  }, [session]);

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { user } = session;

    const updates = {
      id: user.id,
      ...profile,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      setMessage('Error updating profile!');
    } else {
      setMessage('Profile saved successfully!');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
    }));
  };

  if (loading && !profile.id) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh'}}>Loading...</div>;

  return (
    <div className="profile-container">
      {message && <div className={message.includes('Error') ? 'error-message' : 'success-message'}>{message}</div>}

      <form onSubmit={updateProfile}>
        <div className="panel">
          <h3 className="mb-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Globe className="text-muted" size={20} /> Basic Details
          </h3>
          <div className="form-group">
            <label>Age</label>
            <input type="number" name="age" value={profile.age} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Current Country</label>
            <input type="text" name="country" value={profile.country} onChange={handleInputChange} />
          </div>
          <div className="form-group" style={{marginBottom: 0}}>
            <label>English Proficiency</label>
            <select name="english" value={profile.english} onChange={handleInputChange}>
              <option value={0}>Competent (0 points)</option>
              <option value={10}>Proficient (10 points)</option>
              <option value={20}>Superior (20 points)</option>
            </select>
          </div>
        </div>

        <div className="panel">
          <h3 className="mb-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <GraduationCap className="text-muted" size={20} /> Education
          </h3>
          <div className="form-group">
            <label>Highest Qualification</label>
            <select name="education" value={profile.education} onChange={handleInputChange}>
              <option value={0}>None / Unrecognized</option>
              <option value={10}>Trade Qualification / Diploma</option>
              <option value={15}>Bachelor / Master Degree</option>
              <option value={20}>Doctorate (PhD)</option>
            </select>
          </div>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="specialistEdu" checked={profile.specialistEdu} onChange={handleInputChange} />
              Specialist Education
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="ausStudy" checked={profile.ausStudy} onChange={handleInputChange} />
              Australian Study Requirement
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="regionalStudy" checked={profile.regionalStudy} onChange={handleInputChange} />
              Regional Australia Study
            </label>
          </div>
        </div>

        <div className="panel">
          <h3 className="mb-2" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Briefcase className="text-muted" size={20} /> Experience & Extras
          </h3>
          <div className="form-group">
            <label>Overseas Experience (years)</label>
            <input type="number" name="overseasExp" value={profile.overseasExp} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Australian Experience (years)</label>
            <input type="number" name="ausExp" value={profile.ausExp} onChange={handleInputChange} />
          </div>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="professionalYear" checked={profile.professionalYear} onChange={handleInputChange} />
              Professional Year in Australia
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="ccl" checked={profile.ccl} onChange={handleInputChange} />
              Credentialled Community Language (CCL)
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{position: 'sticky', bottom: '80px', zIndex: 10}}>
          <CheckCircle2 size={20} />
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
