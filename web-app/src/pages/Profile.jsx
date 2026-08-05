import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Globe, GraduationCap, Briefcase, CheckCircle2, ChevronRight, Users, LogOut, FileText, Upload, Download } from 'lucide-react';
import OccupationSearch from '../components/OccupationSearch';
import CvUploadModal from '../components/CvUploadModal';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import { SkeletonPage } from '../components/ui/Skeleton';

const SECTIONS = [
  { id: 'basic', label: 'Basic Details', icon: Globe },
  { id: 'language', label: 'Language Proficiency', icon: GraduationCap },
  { id: 'family', label: 'Family and Spouse', icon: Users },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'experience', label: 'Experience & Extras', icon: Briefcase },
  { id: 'cv', label: 'My CV', icon: FileText },
];

function SectionRow({ icon: Icon, label, onClick }) {
  return (
    <button type="button" className="profile-section-row" onClick={onClick}>
      <Icon size={20} className="profile-section-icon" aria-hidden="true" />
      <span className="profile-section-label">{label}</span>
      <ChevronRight size={20} className="profile-section-chevron" aria-hidden="true" />
    </button>
  );
}

function CvViewer({ cvPath, onMissing }) {
  const [cvSignedUrl, setCvSignedUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchUrl() {
      setLoadingUrl(true);
      const { data, error } = await supabase.storage
        .from('cv-uploads')
        .createSignedUrl(cvPath, 60 * 60); // 1 hour expiry

      if (!active) return;

      if (error) {
        console.error('Storage error resolving CV:', error);
        setErrorMessage(error.message);
        setCvSignedUrl(null);
      } else {
        setErrorMessage(null);
        setCvSignedUrl(data?.signedUrl ?? null);
      }
      setLoadingUrl(false);
    }
    fetchUrl();
    return () => { active = false; };
  }, [cvPath]);

  if (loadingUrl) return <p className="text-muted">Loading CV viewer...</p>;

  // A recorded CV whose file is gone is a dead end, so offer the way out
  // rather than surfacing the raw storage error.
  if (!cvSignedUrl) {
    return (
      <div className="empty-state">
        <FileText size={48} className="text-muted" aria-hidden="true" />
        <h3>We couldn&apos;t open your CV</h3>
        <p className="text-muted">
          The stored file is no longer available. Uploading it again will fix this.
        </p>
        <button type="button" className="btn-primary" onClick={onMissing}>
          <Upload size={20} aria-hidden="true" /> Upload again
        </button>
        {errorMessage && <p className="cv-error-detail">{errorMessage}</p>}
      </div>
    );
  }

  return (
    <div className="cv-viewer">
      <span className="cv-viewer-icon">
        <FileText size={32} aria-hidden="true" />
      </span>
      <div className="cv-viewer-body">
        <span className="cv-viewer-title">Your Resume</span>
        <span className="cv-viewer-meta">Ready to download</span>
      </div>
      <a
        href={cvSignedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary cv-viewer-download"
        download
      >
        <Download size={18} aria-hidden="true" />
        Download
      </a>
    </div>
  );
}

export default function Profile({ session }) {
  const [searchParams, setSearchParams] = useSearchParams();
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
    location: '',
    marital_status: 'Single',
    phone_no: '',
    email: '',
  });

  // Kept out of basicDetails so it is never upserted into profile_basic.
  const [cvPath, setCvPath] = useState(null);

  const [languageProficiency, setLanguageProficiency] = useState([]);

  const [countries, setCountries] = useState([]);
  const [message, setMessage] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const toggleSection = (section) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // Landing's "Upload CV" CTA carries ?intent=upload_cv through signup and
  // login; honour it here, then drop the param so a refresh does not reopen it.
  useEffect(() => {
    if (searchParams.get('intent') !== 'upload_cv') return;
    setIsCvModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('intent');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // The home checklist links straight into a section via ?section=; open it
  // here, then drop the param so a refresh does not reopen it.
  useEffect(() => {
    const section = searchParams.get('section');
    if (!section || !SECTIONS.some((s) => s.id === section)) return;
    setExpandedSection(section);
    const next = new URLSearchParams(searchParams);
    next.delete('section');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let ignore = false;
    async function getProfile() {
      setLoading(true);
      const { user } = session;

      const { data } = await supabase
        .from('point_australia')
        .select('*')
        .eq('id', user.id)
        .single();
        
      const { data: basicData } = await supabase
        .from('profile_basic')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: cvData } = await supabase
        .from('cv_metadata')
        .select('file_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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
          // profile_basic.cv_url is a legacy column from an earlier storage
          // bucket. It is dropped here so a stale path can never be shown or
          // written back — cv_metadata is the source of truth for the CV.
          const { cv_url: _legacyCvUrl, ...rest } = basicData;
          setBasicDetails(prev => ({ ...prev, ...rest }));
        }
        setCvPath(cvData?.file_url ?? null);
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

    const succeeded = !profileError && !basicError && !languageError;
    setMessage(succeeded ? 'Profile saved successfully!' : 'Error updating profile!');
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
    return succeeded;
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
    // Branch on the returned result: `message` still holds its pre-save value
    // at this point, so reading it here would always look like a success.
    const succeeded = await updateProfile(e);
    if (succeeded) {
      closeModal();
    }
  };

  if (loading && !profile.id) return <SkeletonPage lines={4} label="Loading your profile" />;

  const userEmail = session?.user?.email || 'User';
  const displayName = basicDetails.name || session?.user?.user_metadata?.full_name || userEmail.split('@')[0];
  const avatarUrl = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture;

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
      <Toast message={message} />

      <div className="profile-identity">
        {avatarUrl && !avatarFailed ? (
          <img
            className="profile-avatar-image"
            src={avatarUrl}
            alt=""
            width="64"
            height="64"
            // A provider avatar that 404s would otherwise leave a broken-image
            // glyph where the person's face should be.
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <span className="profile-avatar">
            <User size={32} aria-hidden="true" />
          </span>
        )}
        <div>
          <h2 className="profile-name">{displayName}</h2>
          <p className="profile-meta">
            {calculatedAge !== 'N/A' ? `${calculatedAge} years old` : 'Age N/A'} &bull; {basicDetails.country || 'No Country Selected'}
          </p>
        </div>
      </div>

      <div className="profile-sections">
        {SECTIONS.map(({ id, label, icon }) => (
          <SectionRow key={id} icon={icon} label={label} onClick={() => toggleSection(id)} />
        ))}
      </div>

      <button
        type="button"
        className="btn-secondary btn-danger profile-signout"
        onClick={async () => {
          await supabase.auth.signOut();
        }}
      >
        <LogOut size={20} aria-hidden="true" />
        <span>Sign Out</span>
      </button>

      <Modal
        isOpen={Boolean(expandedSection)}
        onClose={closeModal}
        title={SECTIONS.find((s) => s.id === expandedSection)?.label ?? ''}
      >
            {expandedSection === 'cv' ? (
              <div className="cv-panel">
                {cvPath ? (
                  <>
                    <div className="cv-panel-actions">
                      <button
                        type="button"
                        className="btn-secondary btn-compact"
                        onClick={() => setIsCvModalOpen(true)}
                      >
                        <Upload size={16} aria-hidden="true" /> Replace CV
                      </button>
                    </div>

                    <CvViewer cvPath={cvPath} onMissing={() => setIsCvModalOpen(true)} />
                  </>
                ) : (
                  <div className="empty-state">
                    <FileText size={48} className="text-muted" aria-hidden="true" />
                    <h3>No CV Uploaded</h3>
                    <p className="text-muted">Upload your resume to get personalized migration insights.</p>
                    <button type="button" className="btn-primary" onClick={() => setIsCvModalOpen(true)}>
                      <Upload size={20} aria-hidden="true" /> Upload CV
                    </button>
                  </div>
                )}
              </div>
            ) : (
            <form onSubmit={handleModalSave}>
              {expandedSection === 'basic' && (
                <>
                  <div className="form-group">
                    <label htmlFor="profile-name">Full Name</label>
                    <input id="profile-name" type="text" name="name" value={basicDetails.name || ''} onChange={handleBasicChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-dob">Date of Birth</label>
                    <input id="profile-dob" type="date" name="dob" value={basicDetails.dob || ''} onChange={handleBasicChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-email">Email</label>
                    <input id="profile-email" type="email" name="email" value={basicDetails.email || ''} onChange={handleBasicChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-phone">Phone Number</label>
                    <input id="profile-phone" type="text" name="phone_no" value={basicDetails.phone_no || ''} onChange={handleBasicChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-country">Current Country</label>
                    <select id="profile-country" name="country" value={basicDetails.country} onChange={handleBasicChange}>
                      <option value="">Select a country</option>
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-location">Location (City/State)</label>
                    <input id="profile-location" type="text" name="location" value={basicDetails.location || ''} onChange={handleBasicChange} placeholder="E.g., Sydney, NSW" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-marital-status">Marital Status</label>
                    <select id="profile-marital-status" name="marital_status" value={basicDetails.marital_status || 'Single'} onChange={handleBasicChange}>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="De Facto">De Facto</option>
                      <option value="Divorced">Divorced / Separated</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </>
              )}

              {expandedSection === 'language' && (
                <div className="language-tests">
                  {languageProficiency.map((test, index) => (
                    <div key={index} className="language-test-card">
                      <div className="language-test-head">
                        <h4>Test {index + 1}</h4>
                        {languageProficiency.length > 1 && (
                          <button type="button" onClick={() => removeLanguageTest(index)} className="link-danger">Remove</button>
                        )}
                      </div>
                      <div className="form-group">
                        <label htmlFor={`lang-${index}-type`}>Test Type</label>
                        <select id={`lang-${index}-type`} name="language_test" value={test.language_test || 'IELTS'} onChange={(e) => handleLanguageChange(index, e)}>
                          <option value="IELTS">IELTS</option>
                          <option value="PTE">PTE Academic</option>
                          <option value="TOEFL">TOEFL</option>
                          <option value="Cambridge">Cambridge</option>
                          <option value="OET">OET</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`lang-${index}-overall`}>Overall Score</label>
                        <input id={`lang-${index}-overall`} type="number" step="0.5" name="test_score_overall" value={test.test_score_overall || ''} onChange={(e) => handleLanguageChange(index, e)} />
                      </div>
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label htmlFor={`lang-${index}-listening`}>Listening</label>
                          <input id={`lang-${index}-listening`} type="number" step="0.5" name="test_score_listening" value={test.test_score_listening || ''} onChange={(e) => handleLanguageChange(index, e)} />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`lang-${index}-reading`}>Reading</label>
                          <input id={`lang-${index}-reading`} type="number" step="0.5" name="test_score_reading" value={test.test_score_reading || ''} onChange={(e) => handleLanguageChange(index, e)} />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`lang-${index}-writing`}>Writing</label>
                          <input id={`lang-${index}-writing`} type="number" step="0.5" name="test_score_writing" value={test.test_score_writing || ''} onChange={(e) => handleLanguageChange(index, e)} />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`lang-${index}-speaking`}>Speaking</label>
                          <input id={`lang-${index}-speaking`} type="number" step="0.5" name="test_score_speaking" value={test.test_score_speaking || ''} onChange={(e) => handleLanguageChange(index, e)} />
                        </div>
                      </div>
                      <div className="form-group form-group-last">
                        <label htmlFor={`lang-${index}-date`}>Score Published Date</label>
                        <input id={`lang-${index}-date`} type="date" name="score_published_date" value={test.score_published_date || ''} onChange={(e) => handleLanguageChange(index, e)} />
                      </div>
                    </div>
                  ))}
                  
                  <button type="button" onClick={addLanguageTest} className="btn-dashed">
                    + Add Another Test
                  </button>
                </div>
              )}

              {expandedSection === 'family' && (
                <>
                  <div className="form-group">
                    <label htmlFor="profile-spouse-details">Spouse Details (Skills, English Level, etc.)</label>
                    <textarea id="profile-spouse-details" name="spouseDetails" value={profile.spouseDetails || ''} onChange={handleInputChange} rows="3" placeholder="E.g., Competent English, Positive Skills Assessment..."></textarea>
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-children">Number of Children</label>
                    <input id="profile-children" type="number" name="childrenCount" min="0" value={profile.childrenCount || 0} onChange={handleInputChange} />
                  </div>
                </>
              )}

              {expandedSection === 'education' && (
                <>
                  <div className="form-group">
                    {/* The label lives inside OccupationSearch, on its input —
                        a second one out here would point at nothing. */}
                    <OccupationSearch
                      label="Education ANZSCO Code"
                      value={profile.educationAnzsco}
                      onChange={(val) => setProfile(prev => ({ ...prev, educationAnzsco: val }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-education">Highest Qualification</label>
                    <select id="profile-education" name="education" value={profile.education} onChange={handleInputChange}>
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
                    <OccupationSearch
                      label="Experience ANZSCO Code"
                      value={profile.experienceAnzsco}
                      onChange={(val) => setProfile(prev => ({ ...prev, experienceAnzsco: val }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-overseas-exp">Overseas Experience (years)</label>
                    <input id="profile-overseas-exp" type="number" min="0" name="overseasExp" value={profile.overseasExp} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="profile-aus-exp">Australian Experience (years)</label>
                    <input id="profile-aus-exp" type="number" min="0" name="ausExp" value={profile.ausExp} onChange={handleInputChange} />
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
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  <CheckCircle2 size={20} aria-hidden="true" />
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
            )}
      </Modal>

      <CvUploadModal
        isOpen={isCvModalOpen} 
        onClose={() => setIsCvModalOpen(false)} 
        onUploadComplete={(path) => {
          setCvPath(path);
        }} 
      />
    </div>
  );
}
