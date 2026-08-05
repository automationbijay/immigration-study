import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Globe, GraduationCap, Briefcase, CheckCircle2, ChevronDown, ChevronUp, Users, LogOut, FileText, Upload } from 'lucide-react';
import OccupationSearch from '../components/OccupationSearch';
import CvUploadModal from '../components/CvUploadModal';

function CvViewer({ cvUrl }) {
  const [cvSignedUrl, setCvSignedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchUrl() {
      setLoadingUrl(true);
      const { data, error } = await supabase.storage
        .from('cvs')
        .createSignedUrl(cvUrl, 60); // 60 seconds expiry

      if (active) {
        if (data) setCvSignedUrl(data.signedUrl);
        setLoadingUrl(false);
      }
    }
    fetchUrl();
    return () => { active = false; };
  }, [cvUrl]);

  if (loadingUrl) return <div>Loading CV viewer...</div>;
  if (!cvSignedUrl) return <div>Error loading CV.</div>;

  return (
    <iframe 
      src={cvSignedUrl} 
      title="User CV"
      style={{ width: '100%', height: '600px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
    />
  );
}

export default function Profile({ session }) {
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);
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
    educationAnzsco: null,
    experienceAnzsco: null,
  });
  
  const [basicDetails, setBasicDetails] = useState({
    dob: '',
    name: '',
    country: '',
    marital_status: 'Single',
    phone_no: '',
    marital_status: 'Single',
    phone_no: '',
    email: '',
    cv_url: null,
  });

  const [uploadingCv, setUploadingCv] = useState(false);

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
        .from('point_australia')
        .select('*')
        .eq('id', user.id)
        .single();
        
      const { data: basicData } = await supabase
        .from('profile_basic')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: ieltsData } = await supabase.from('test_ielts').select('*').eq('user_id', user.id);
      const { data: pteData } = await supabase.from('test_pte').select('*').eq('user_id', user.id);
      const { data: toeflData } = await supabase.from('test_toefl').select('*').eq('user_id', user.id);
      const { data: cambridgeData } = await supabase.from('test_cambridge').select('*').eq('user_id', user.id);
      const { data: oetData } = await supabase.from('test_oet').select('*').eq('user_id', user.id);

      const combinedLanguageData = [];
      if (ieltsData) combinedLanguageData.push(...ieltsData.map(d => ({ ...d, language_test: 'IELTS' })));
      if (pteData) combinedLanguageData.push(...pteData.map(d => ({ ...d, language_test: 'PTE' })));
      if (toeflData) combinedLanguageData.push(...toeflData.map(d => ({ ...d, language_test: 'TOEFL' })));
      if (cambridgeData) combinedLanguageData.push(...cambridgeData.map(d => ({ ...d, language_test: 'Cambridge' })));
      if (oetData) combinedLanguageData.push(...oetData.map(d => ({ ...d, language_test: 'OET' })));

      const languageData = combinedLanguageData.map(test => ({
        id: test.id,
        language_test: test.language_test,
        test_score_listening: test.listening ?? '',
        test_score_reading: test.reading ?? '',
        test_score_writing: test.writing ?? '',
        test_score_speaking: test.speaking ?? '',
        test_score_overall: test.overall ?? '',
        score_published_date: test.test_date ?? ''
      }));

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

    const { error: profileError } = await supabase.from('point_australia').upsert(profileUpdates);
    const { error: basicError } = await supabase.from('profile_basic').upsert(basicUpdates);
    
    // For language tests, upsert to respective tables
    let languageError = null;
    const newLanguageProficiency = [...languageProficiency];
    for (let i = 0; i < newLanguageProficiency.length; i++) {
      const lp = newLanguageProficiency[i];
      let tableName = '';
      if (lp.language_test === 'IELTS') tableName = 'test_ielts';
      else if (lp.language_test === 'PTE') tableName = 'test_pte';
      else if (lp.language_test === 'TOEFL') tableName = 'test_toefl';
      else if (lp.language_test === 'Cambridge') tableName = 'test_cambridge';
      else if (lp.language_test === 'OET') tableName = 'test_oet';
      
      if (tableName) {
        const updateData = {
          user_id: user.id,
          listening: lp.test_score_listening !== '' ? parseFloat(lp.test_score_listening) : null,
          reading: lp.test_score_reading !== '' ? parseFloat(lp.test_score_reading) : null,
          writing: lp.test_score_writing !== '' ? parseFloat(lp.test_score_writing) : null,
          speaking: lp.test_score_speaking !== '' ? parseFloat(lp.test_score_speaking) : null,
          overall: lp.test_score_overall !== '' ? parseFloat(lp.test_score_overall) : null,
          test_date: lp.score_published_date || null,
          updated_at: new Date(),
        };
        if (lp.id) {
          updateData.id = lp.id;
        }
        
        const { data, error } = await supabase.from(tableName).upsert(updateData).select();
        if (error) {
          languageError = error;
        } else if (data && data.length > 0) {
          newLanguageProficiency[i] = { ...lp, id: data[0].id };
        }
      }
    }
    setLanguageProficiency(newLanguageProficiency);

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
      let tableName = '';
      if (testToRemove.language_test === 'IELTS') tableName = 'test_ielts';
      else if (testToRemove.language_test === 'PTE') tableName = 'test_pte';
      else if (testToRemove.language_test === 'TOEFL') tableName = 'test_toefl';
      else if (testToRemove.language_test === 'Cambridge') tableName = 'test_cambridge';
      else if (testToRemove.language_test === 'OET') tableName = 'test_oet';

      if (tableName) {
        await supabase.from(tableName).delete().eq('id', testToRemove.id);
      }
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

      <div className="panel" style={{cursor: 'pointer'}} onClick={() => toggleSection('cv')}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3 className="mb-0" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0}}>
            <FileText className="text-muted" size={20} /> My CV
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
                {expandedSection === 'cv' && 'My CV'}
              </h2>
            </div>
            
            {expandedSection === 'cv' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {basicDetails.cv_url ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>Your Resume</h3>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: '0.5rem 1rem' }} 
                        onClick={() => setIsCvModalOpen(true)}
                      >
                        <Upload size={16} className="inline-icon" /> Replace CV
                      </button>
                    </div>
                    
                    <CvViewer cvUrl={basicDetails.cv_url} />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <FileText size={48} className="text-muted" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>No CV Uploaded</h3>
                    <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Upload your resume to get personalized migration insights.</p>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      onClick={() => setIsCvModalOpen(true)}
                      style={{ margin: '0 auto' }}
                    >
                      <Upload size={20} className="inline-icon" /> Upload CV
                    </button>
                  </div>
                )}
                
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={closeModal} style={{flex: 1}}>Close</button>
                </div>
              </div>
            ) : (
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
                          <option value="TOEFL">TOEFL</option>
                          <option value="Cambridge">Cambridge</option>
                          <option value="OET">OET</option>
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
                    <label style={{marginBottom: '0.5rem'}}>Education ANZSCO Code</label>
                    <OccupationSearch
                      value={profile.educationAnzsco}
                      onChange={(val) => setProfile(prev => ({ ...prev, educationAnzsco: val }))}
                    />
                  </div>
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
                    <label style={{marginBottom: '0.5rem'}}>Experience ANZSCO Code</label>
                    <OccupationSearch
                      value={profile.experienceAnzsco}
                      onChange={(val) => setProfile(prev => ({ ...prev, experienceAnzsco: val }))}
                    />
                  </div>
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
            )}
          </div>
        </div>
      )}

      <CvUploadModal 
        isOpen={isCvModalOpen} 
        onClose={() => setIsCvModalOpen(false)} 
        onUploadComplete={(path) => {
          setBasicDetails(prev => ({ ...prev, cv_url: path }));
        }} 
      />
    </div>
  );
}
