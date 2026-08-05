import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Globe, GraduationCap, Briefcase, CheckCircle2, ChevronDown, ChevronUp, Users, LogOut } from 'lucide-react';

export default function Profile({ session }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    spouseDetails: '',
    childrenCount: 0,
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
  
  const [basicDetails, setBasicDetails] = useState({
    dob: '',
    name: '',
    country: '',
    marital_status: 'Single',
    phone_no: '',
    email: '',
  });

  const [languageProficiency, setLanguageProficiency] = useState([]);

  const [countries, setCountries] = useState([]);
  const [message, setMessage] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

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
        
      const { data: basicData } = await supabase
        .from('basic_details')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: languageData } = await supabase
        .from('language_proficiency')
        .select('*')
        .eq('user_id', user.id);

      const { data: countriesData } = await supabase
        .from('countries')
        .select('name')
        .order('name');

      if (!ignore) {
        if (data) {
          setProfile(prev => ({ ...prev, ...data }));
        }
        if (basicData) {
          setBasicDetails(prev => ({ ...prev, ...basicData }));
        }
        if (languageData && languageData.length > 0) {
          setLanguageProficiency(languageData);
        } else {
          setLanguageProficiency([{
            language_test: 'IELTS',
            test_score_listening: '',
            test_score_reading: '',
            test_score_writing: '',
            test_score_speaking: '',
            test_score_overall: '',
            score_published_date: ''
          }]);
        }
        if (countriesData) {
          setCountries(countriesData.map(c => c.name));
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

    const profileUpdates = {
      id: user.id,
      ...profile,
      updated_at: new Date(),
    };
    
    const basicUpdates = {
      id: user.id,
      ...basicDetails,
      dob: basicDetails.dob === '' ? null : basicDetails.dob,
      updated_at: new Date(),
    };

    const languageUpdates = languageProficiency.map(lp => ({
      ...lp,
      user_id: user.id,
      score_published_date: lp.score_published_date === '' ? null : lp.score_published_date,
      updated_at: new Date(),
    }));

    const { error: profileError } = await supabase.from('profiles').upsert(profileUpdates);
    const { error: basicError } = await supabase.from('basic_details').upsert(basicUpdates);
    
    // For language_proficiency, upsert array
    let languageError = null;
    if (languageUpdates.length > 0) {
      const { error } = await supabase.from('language_proficiency').upsert(languageUpdates);
      languageError = error;
    }

    if (profileError || basicError || languageError) {
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

  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    setBasicDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLanguageChange = (index, e) => {
    const { name, value } = e.target;
    setLanguageProficiency(prev => {
      const newArray = [...prev];
      newArray[index] = { ...newArray[index], [name]: value };
      return newArray;
    });
  };

  const addLanguageTest = () => {
    setLanguageProficiency(prev => [
      ...prev, 
      { 
        language_test: 'IELTS', 
        test_score_listening: '', 
        test_score_reading: '', 
        test_score_writing: '', 
        test_score_speaking: '', 
        test_score_overall: '', 
        score_published_date: '' 
      }
    ]);
  };

  const removeLanguageTest = async (index) => {
    const testToRemove = languageProficiency[index];
    if (testToRemove.id) {
      // If it exists in DB, delete it
      await supabase.from('language_proficiency').delete().eq('id', testToRemove.id);
    }
    setLanguageProficiency(prev => prev.filter((_, i) => i !== index));
  };

  const closeModal = () => {
    setExpandedSection(null);
  };

  const handleModalSave = async (e) => {
    e.preventDefault();
    await updateProfile(e);
    if (!message.includes('Error')) {
      closeModal();
    }
  };

  if (loading && !profile.id) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh'}}>Loading...</div>;

  const userEmail = session?.user?.email || 'User';
  const displayName = basicDetails.name || userEmail.split('@')[0];

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculatedAge = calculateAge(basicDetails.dob);

  return (
    <div className="profile-container">
      {message && <div className={message.includes('Error') ? 'error-message' : 'success-message'}>{message}</div>}

      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={32} className="text-muted" />
        </div>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{displayName}</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
            {calculatedAge !== 'N/A' ? `${calculatedAge} years old` : 'Age N/A'} &bull; {basicDetails.country || 'No Country Selected'}
          </p>
        </div>
      </div>

      <div className="panel" style={{cursor: 'pointer'}} onClick={() => toggleSection('basic')}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3 className="mb-0" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0}}>
            <Globe className="text-muted" size={20} /> Basic Details
          </h3>
          <span className="text-muted"><ChevronDown size={20} style={{transform: 'rotate(-90deg)'}}/></span>
        </div>
      </div>

      <div className="panel" style={{cursor: 'pointer'}} onClick={() => toggleSection('language')}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3 className="mb-0" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0}}>
            <GraduationCap className="text-muted" size={20} /> Language Proficiency
          </h3>
          <span className="text-muted"><ChevronDown size={20} style={{transform: 'rotate(-90deg)'}}/></span>
        </div>
      </div>

      <div className="panel" style={{cursor: 'pointer'}} onClick={() => toggleSection('family')}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3 className="mb-0" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0}}>
            <Users className="text-muted" size={20} /> Family and Spouse
          </h3>
          <span className="text-muted"><ChevronDown size={20} style={{transform: 'rotate(-90deg)'}}/></span>
        </div>
      </div>

      <div className="panel" style={{cursor: 'pointer'}} onClick={() => toggleSection('education')}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3 className="mb-0" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0}}>
            <GraduationCap className="text-muted" size={20} /> Education
          </h3>
          <span className="text-muted"><ChevronDown size={20} style={{transform: 'rotate(-90deg)'}}/></span>
        </div>
      </div>

      <div className="panel" style={{cursor: 'pointer'}} onClick={() => toggleSection('experience')}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3 className="mb-0" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0}}>
            <Briefcase className="text-muted" size={20} /> Experience & Extras
          </h3>
          <span className="text-muted"><ChevronDown size={20} style={{transform: 'rotate(-90deg)'}}/></span>
        </div>
      </div>

      <div style={{ marginTop: '2rem', paddingBottom: '2rem' }}>
        <button 
          type="button" 
          className="btn-secondary" 
          style={{ width: '100%', padding: '0.875rem', color: 'var(--color-destructive)', borderColor: 'var(--color-destructive)' }}
          onClick={async () => {
            await supabase.auth.signOut();
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        </button>
      </div>

      {expandedSection && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{margin: 0}}>
                {expandedSection === 'basic' && 'Basic Details'}
                {expandedSection === 'language' && 'Language Proficiency'}
                {expandedSection === 'family' && 'Family and Spouse'}
                {expandedSection === 'education' && 'Education'}
                {expandedSection === 'experience' && 'Experience & Extras'}
              </h2>
            </div>
            
            <form onSubmit={handleModalSave}>
              {expandedSection === 'basic' && (
                <>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="name" value={basicDetails.name || ''} onChange={handleBasicChange} />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" name="dob" value={basicDetails.dob || ''} onChange={handleBasicChange} style={{width: '100%', padding: '0.875rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontFamily: 'inherit', fontSize: '1rem'}} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={basicDetails.email || ''} onChange={handleBasicChange} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" name="phone_no" value={basicDetails.phone_no || ''} onChange={handleBasicChange} />
                  </div>
                  <div className="form-group">
                    <label>Current Country</label>
                    <select name="country" value={basicDetails.country} onChange={handleBasicChange}>
                      <option value="">Select a country</option>
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}

              {expandedSection === 'language' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {languageProficiency.map((test, index) => (
                    <div key={index} style={{ border: '1px solid var(--color-border)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0 }}>Test {index + 1}</h4>
                        {languageProficiency.length > 1 && (
                          <button type="button" onClick={() => removeLanguageTest(index)} style={{ background: 'none', border: 'none', color: 'var(--color-destructive)', cursor: 'pointer', fontSize: '0.875rem' }}>Remove</button>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Test Type</label>
                        <select name="language_test" value={test.language_test || 'IELTS'} onChange={(e) => handleLanguageChange(index, e)}>
                          <option value="IELTS">IELTS</option>
                          <option value="PTE">PTE Academic</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Overall Score</label>
                        <input type="number" step="0.5" name="test_score_overall" value={test.test_score_overall || ''} onChange={(e) => handleLanguageChange(index, e)} />
                      </div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div className="form-group">
                          <label>Listening</label>
                          <input type="number" step="0.5" name="test_score_listening" value={test.test_score_listening || ''} onChange={(e) => handleLanguageChange(index, e)} />
                        </div>
                        <div className="form-group">
                          <label>Reading</label>
                          <input type="number" step="0.5" name="test_score_reading" value={test.test_score_reading || ''} onChange={(e) => handleLanguageChange(index, e)} />
                        </div>
                        <div className="form-group">
                          <label>Writing</label>
                          <input type="number" step="0.5" name="test_score_writing" value={test.test_score_writing || ''} onChange={(e) => handleLanguageChange(index, e)} />
                        </div>
                        <div className="form-group">
                          <label>Speaking</label>
                          <input type="number" step="0.5" name="test_score_speaking" value={test.test_score_speaking || ''} onChange={(e) => handleLanguageChange(index, e)} />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Score Published Date</label>
                        <input type="date" name="score_published_date" value={test.score_published_date || ''} onChange={(e) => handleLanguageChange(index, e)} style={{width: '100%', padding: '0.875rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontFamily: 'inherit', fontSize: '1rem'}} />
                      </div>
                    </div>
                  ))}
                  
                  <button type="button" onClick={addLanguageTest} style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)', color: 'var(--color-accent)', padding: '1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}>
                    + Add Another Test
                  </button>
                </div>
              )}

              {expandedSection === 'family' && (
                <>
                  <div className="form-group">
                    <label>Marital Status</label>
                    <select name="marital_status" value={basicDetails.marital_status || 'Single'} onChange={handleBasicChange}>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="De Facto">De Facto</option>
                      <option value="Divorced">Divorced / Separated</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Spouse Details (Skills, English Level, etc.)</label>
                    <textarea name="spouseDetails" value={profile.spouseDetails || ''} onChange={handleInputChange} rows="3" placeholder="E.g., Competent English, Positive Skills Assessment..." style={{width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)'}}></textarea>
                  </div>
                  <div className="form-group">
                    <label>Number of Children</label>
                    <input type="number" name="childrenCount" min="0" value={profile.childrenCount || 0} onChange={handleInputChange} />
                  </div>
                </>
              )}

              {expandedSection === 'education' && (
                <>
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
                </>
              )}

              {expandedSection === 'experience' && (
                <>
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
                </>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} style={{flex: 1}}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading} style={{flex: 1}}>
                  <CheckCircle2 size={20} />
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
