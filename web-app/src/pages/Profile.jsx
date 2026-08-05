import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Globe, GraduationCap, Briefcase } from 'lucide-react';

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
      setMessage('Profile updated successfully!');
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

  if (loading && !profile.id) return <div className="loading">Loading profile...</div>;

  return (
    <div className="profile-container">
      <div className="glass-panel profile-panel">
        <h2><User className="inline-icon" /> My Profile</h2>
        <p>Update your details to automatically calculate your visa points.</p>

        {message && <div className={message.includes('Error') ? 'error-message' : 'success-message'}>{message}</div>}

        <form onSubmit={updateProfile} className="profile-form">
          <section className="form-section">
            <h3><Globe className="inline-icon" /> Basic Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Age</label>
                <input type="number" name="age" value={profile.age} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Current Country</label>
                <input type="text" name="country" value={profile.country} onChange={handleInputChange} />
              </div>
            </div>
            
            <div className="form-group">
              <label>English Proficiency</label>
              <select name="english" value={profile.english} onChange={handleInputChange}>
                <option value={0}>Competent (0 points)</option>
                <option value={10}>Proficient (10 points)</option>
                <option value={20}>Superior (20 points)</option>
              </select>
            </div>
          </section>

          <section className="form-section">
            <h3><GraduationCap className="inline-icon" /> Education</h3>
            <div className="form-group">
              <label>Highest Qualification</label>
              <select name="education" value={profile.education} onChange={handleInputChange}>
                <option value={0}>None / Unrecognized (0 points)</option>
                <option value={10}>Trade Qualification / Diploma (10 points)</option>
                <option value={15}>Bachelor / Master Degree (15 points)</option>
                <option value={20}>Doctorate (PhD) (20 points)</option>
              </select>
            </div>
            
            <div className="checkbox-group">
              <label>
                <input type="checkbox" name="specialistEdu" checked={profile.specialistEdu} onChange={handleInputChange} />
                Specialist Education Qualification (10 points)
              </label>
              <label>
                <input type="checkbox" name="ausStudy" checked={profile.ausStudy} onChange={handleInputChange} />
                Australian Study Requirement (5 points)
              </label>
              <label>
                <input type="checkbox" name="regionalStudy" checked={profile.regionalStudy} onChange={handleInputChange} />
                Study in Regional Australia (5 points)
              </label>
            </div>
          </section>

          <section className="form-section">
            <h3><Briefcase className="inline-icon" /> Work Experience</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Overseas Experience (years)</label>
                <input type="number" name="overseasExp" value={profile.overseasExp} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Australian Experience (years)</label>
                <input type="number" name="ausExp" value={profile.ausExp} onChange={handleInputChange} />
              </div>
            </div>
          </section>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
