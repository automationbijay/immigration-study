import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from '../lib/ProfileContext';
import { User, Globe, GraduationCap, Briefcase, CheckCircle2, ChevronRight, Users, LogOut, FileText, Upload, Download, Trash2 } from 'lucide-react';
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
  const { profileRow, basicRow, loading: profileLoading, error: profileError, refetch } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    marital_status: '',
    phone_no: '',
    email: '',
  });

  // Kept out of basicDetails so it is never upserted into profile_basic.
  const [cvPath, setCvPath] = useState(null);

  const [languageProficiency, setLanguageProficiency] = useState([]);
  const [educationHistory, setEducationHistory] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [workExperience, setWorkExperience] = useState([]);

  const [countries, setCountries] = useState([]);
  const [message, setMessage] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [loadedSections, setLoadedSections] = useState({});
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState(null);
  const [sectionRetryToken, setSectionRetryToken] = useState(0);

  const handleDeleteData = async () => {
    if (!window.confirm("Are you sure you want to delete all your data? This action cannot be undone.")) return;
    
    setIsDeletingData(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-data');
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);
      
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
      alert(`Failed to delete data: ${err.message || JSON.stringify(err)}. Please try again.`);
    } finally {
      setIsDeletingData(false);
    }
  };

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

  // point_australia + profile_basic are fetched once, app-wide, by
  // ProfileProvider; mirror them into local editable state whenever the
  // shared copy changes (initial load, or a refetch() after saving "basic").
  // Deliberately does NOT touch loadedSections.basic - that flag belongs to
  // the country-list fetch below, and conflating the two used to make the
  // countries fetch permanently unreachable once this ran (see loadSection).
  useEffect(() => {
    if (profileLoading) return;
    if (profileRow) setProfile(prev => ({ ...prev, ...profileRow }));
    if (basicRow) {
      const { cv_url: _legacyCvUrl, ...rest } = basicRow;
      setBasicDetails(prev => ({ ...prev, ...rest }));
    }
  }, [profileRow, basicRow, profileLoading]);

  useEffect(() => {
    if (!expandedSection) return;
    const { user } = session;
    let ignore = false;

    async function loadSection(section) {
      if (loadedSections[section]) return;
      setSectionLoading(true);
      setSectionError(null);

      try {
        if (section === 'cv') {
          const { data, error } = await supabase.from('cv_metadata').select('file_url').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (error) throw error;
          if (!ignore) {
            setCvPath(data?.file_url ?? null);
            setLoadedSections(prev => ({ ...prev, cv: true }));
          }
        } else if (section === 'education') {
          const { data, error } = await supabase.from('profile_education').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
          if (error) throw error;
          if (!ignore) {
            setEducationHistory(data && data.length > 0 ? data : [{ level: '', university_name: '', field_of_study: '', country: '', start_date: '', end_date: '' }]);
            setLoadedSections(prev => ({ ...prev, education: true }));
          }
        } else if (section === 'family') {
          const { data, error } = await supabase.from('profile_family').select('*').eq('profile_id', user.id).order('created_at', { ascending: true });
          if (error) throw error;
          if (!ignore) {
            setFamilyMembers(data && data.length > 0 ? data : [{ relation: '', age: '', highest_education: '', language_test_type: '', language_overall_score: '', gender: '', citizenship_or_pr: '' }]);
            setLoadedSections(prev => ({ ...prev, family: true }));
          }
        } else if (section === 'experience') {
          const { data, error } = await supabase.from('profile_experience').select('*').eq('user_id', user.id).order('start_date', { ascending: false });
          if (error) throw error;
          if (!ignore) {
            setWorkExperience(data && data.length > 0 ? data : [{ company_name: '', role: '', country: '', start_date: '', end_date: '' }]);
            setLoadedSections(prev => ({ ...prev, experience: true }));
          }
        } else if (section === 'language') {
          const results = await Promise.all([
            supabase.from('test_ielts').select('*').eq('user_id', user.id),
            supabase.from('test_pte').select('*').eq('user_id', user.id),
            supabase.from('test_toefl').select('*').eq('user_id', user.id),
            supabase.from('test_cambridge').select('*').eq('user_id', user.id),
            supabase.from('test_oet').select('*').eq('user_id', user.id)
          ]);

          const firstError = results.map((r) => r.error).find(Boolean);
          if (firstError) throw firstError;

          const [
            { data: ielts }, { data: pte }, { data: toefl }, { data: cambridge }, { data: oet }
          ] = results;

          const combined = [];
          if (ielts) combined.push(...ielts.map(d => ({ ...d, language_test: 'IELTS' })));
          if (pte) combined.push(...pte.map(d => ({ ...d, language_test: 'PTE' })));
          if (toefl) combined.push(...toefl.map(d => ({ ...d, language_test: 'TOEFL' })));
          if (cambridge) combined.push(...cambridge.map(d => ({ ...d, language_test: 'Cambridge' })));
          if (oet) combined.push(...oet.map(d => ({ ...d, language_test: 'OET' })));

          if (!ignore) {
            if (combined.length > 0) {
              setLanguageProficiency(combined.map(test => ({
                id: test.id, language_test: test.language_test,
                test_score_listening: test.listening ?? '', test_score_reading: test.reading ?? '',
                test_score_writing: test.writing ?? '', test_score_speaking: test.speaking ?? '',
                test_score_overall: test.overall ?? '', score_published_date: test.test_date ?? ''
              })));
            } else {
              setLanguageProficiency([{ language_test: 'IELTS', test_score_listening: '', test_score_reading: '', test_score_writing: '', test_score_speaking: '', test_score_overall: '', score_published_date: '' }]);
            }
            setLoadedSections(prev => ({ ...prev, language: true }));
          }
        } else if (section === 'basic' && countries.length === 0) {
          const { data, error } = await supabase.from('countries').select('name').order('name');
          if (error) throw error;
          if (!ignore) {
            if (data) setCountries(data.map(c => c.name));
            setLoadedSections(prev => ({ ...prev, basic: true }));
          }
        }
      } catch (err) {
        console.error(`Failed to load ${section}:`, err);
        // Deliberately not marking loadedSections[section] here - closing and
        // reopening (or Retry, wired to sectionRetryToken) must try again
        // rather than settling on an empty section that looks like "no data".
        if (!ignore) setSectionError(err?.message || 'Something went wrong loading this section.');
      } finally {
        if (!ignore) setSectionLoading(false);
      }
    }

    loadSection(expandedSection);
    return () => { ignore = true; };
  }, [expandedSection, session, loadedSections, countries.length, sectionRetryToken]);

  const updateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { user } = session;
    let succeeded = true;

    if (expandedSection === 'basic') {
      const profileUpdates = { id: user.id, ...profile, updated_at: new Date() };
      const basicUpdates = { id: user.id, ...basicDetails, dob: basicDetails.dob === '' ? null : basicDetails.dob, updated_at: new Date() };
      const { error: profileSaveError } = await supabase.from('point_australia').upsert(profileUpdates);
      const { error: basicSaveError } = await supabase.from('profile_basic').upsert(basicUpdates);

      succeeded = !profileSaveError && !basicSaveError;
      // Refresh the app-wide copy (ProfileContext) so Home's score and any
      // other consumer picks up the save without waiting on its own fetch.
      if (succeeded) refetch();
    } else if (expandedSection === 'language') {
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
          if (lp.id) updateData.id = lp.id;
          
          const { data, error } = await supabase.from(tableName).upsert(updateData).select();
          if (error) {
            languageError = error;
          } else if (data && data.length > 0) {
            newLanguageProficiency[i] = { ...lp, id: data[0].id };
          }
        }
      }
      setLanguageProficiency(newLanguageProficiency);
      succeeded = !languageError;
    } else if (expandedSection === 'education') {
      let educationError = null;
      const newEducationHistory = [...educationHistory];
      for (let i = 0; i < newEducationHistory.length; i++) {
        const ed = newEducationHistory[i];
        const updateData = {
          user_id: user.id, level: ed.level || null, university_name: ed.university_name || null,
          field_of_study: ed.field_of_study || null, country: ed.country || null,
          start_date: ed.start_date || null, end_date: ed.end_date || null, updated_at: new Date(),
        };
        if (ed.id) updateData.id = ed.id;
        const { data, error } = await supabase.from('profile_education').upsert(updateData).select();
        if (error) educationError = error;
        else if (data && data.length > 0) newEducationHistory[i] = { ...ed, id: data[0].id };
      }
      setEducationHistory(newEducationHistory);
      succeeded = !educationError;
    } else if (expandedSection === 'family') {
      let familyError = null;
      const newFamilyMembers = [...familyMembers];
      for (let i = 0; i < newFamilyMembers.length; i++) {
        const fm = newFamilyMembers[i];
        const updateData = {
          profile_id: user.id, relation: fm.relation || null, age: fm.age ? parseInt(fm.age) : null,
          highest_education: fm.highest_education || null, language_test_type: fm.language_test_type || null,
          language_overall_score: fm.language_overall_score ? parseFloat(fm.language_overall_score) : null,
          gender: fm.gender || null, citizenship_or_pr: fm.citizenship_or_pr || null, updated_at: new Date(),
        };
        if (fm.id) updateData.id = fm.id;
        const { data, error } = await supabase.from('profile_family').upsert(updateData).select();
        if (error) familyError = error;
        else if (data && data.length > 0) newFamilyMembers[i] = { ...fm, id: data[0].id };
      }
      setFamilyMembers(newFamilyMembers);
      succeeded = !familyError;
    } else if (expandedSection === 'experience') {
      let experienceError = null;
      const newWorkExperience = [...workExperience];
      for (let i = 0; i < newWorkExperience.length; i++) {
        const we = newWorkExperience[i];
        if (!we.company_name || !we.role || !we.country || !we.start_date) continue; // Skip incomplete
        const updateData = {
          user_id: user.id, company_name: we.company_name, role: we.role, country: we.country,
          start_date: we.start_date, end_date: we.end_date || null,
        };
        if (we.id) updateData.id = we.id;
        const { data, error } = await supabase.from('profile_experience').upsert(updateData).select();
        if (error) experienceError = error;
        else if (data && data.length > 0) newWorkExperience[i] = { ...we, id: data[0].id };
      }
      setWorkExperience(newWorkExperience);
      succeeded = !experienceError;
    }

    setMessage(succeeded ? 'Profile saved successfully!' : 'Error updating profile!');
    setSaving(false);
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

  const handleEducationChange = (index, e) => {
    const { name, value } = e.target;
    setEducationHistory(prev => {
      const newArray = [...prev];
      newArray[index] = { ...newArray[index], [name]: value };
      return newArray;
    });
  };

  const addEducation = () => {
    setEducationHistory(prev => [
      ...prev, 
      { 
        level: '', university_name: '', field_of_study: '', country: '',
        start_date: '', end_date: '' 
      }
    ]);
  };

  const removeEducation = async (index) => {
    const edToRemove = educationHistory[index];
    if (edToRemove.id) {
      await supabase.from('profile_education').delete().eq('id', edToRemove.id);
    }
    setEducationHistory(prev => prev.filter((_, i) => i !== index));
  };

  const handleFamilyChange = (index, e) => {
    const { name, value } = e.target;
    setFamilyMembers(prev => {
      const newArray = [...prev];
      newArray[index] = { ...newArray[index], [name]: value };
      return newArray;
    });
  };

  const addFamilyMember = () => {
    setFamilyMembers(prev => [
      ...prev, 
      { relation: '', age: '', highest_education: '', language_test_type: '', language_overall_score: '', gender: '', citizenship_or_pr: '' }
    ]);
  };

  const removeFamilyMember = async (index) => {
    const fmToRemove = familyMembers[index];
    if (fmToRemove.id) {
      await supabase.from('profile_family').delete().eq('id', fmToRemove.id);
    }
    setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleExperienceChange = (index, e) => {
    const { name, value } = e.target;
    setWorkExperience(prev => {
      const newArray = [...prev];
      newArray[index] = { ...newArray[index], [name]: value };
      return newArray;
    });
  };

  const addExperience = () => {
    setWorkExperience(prev => [
      ...prev,
      { company_name: '', role: '', country: '', start_date: '', end_date: '' }
    ]);
  };

  const removeExperience = async (index) => {
    const expToRemove = workExperience[index];
    if (expToRemove.id) {
      await supabase.from('profile_experience').delete().eq('id', expToRemove.id);
    }
    setWorkExperience(prev => prev.filter((_, i) => i !== index));
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

  if (profileLoading && !profile.id) return <SkeletonPage lines={4} label="Loading your profile" />;

  if (profileError && !profile.id) {
    return (
      <div className="profile-container">
        <div className="empty-state">
          <h3>We couldn&apos;t load your profile</h3>
          <p className="text-muted">Check your connection and try again.</p>
          <button type="button" className="btn-primary" onClick={refetch}>Retry</button>
        </div>
      </div>
    );
  }

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
            {calculatedAge !== 'N/A' ? `${calculatedAge} years old` : 'Age N/A'} &bull; {basicDetails.location ? `${basicDetails.location}, ${basicDetails.country}` : (basicDetails.country || 'No Country Selected')}
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
        className="btn-secondary profile-signout"
        style={{ color: 'var(--danger)', borderColor: 'var(--danger-border, var(--danger))', marginBottom: '12px' }}
        onClick={handleDeleteData}
        disabled={isDeletingData}
      >
        <Trash2 size={20} aria-hidden="true" />
        <span>{isDeletingData ? 'Deleting...' : 'Delete All My Data'}</span>
      </button>

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
        {sectionLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading {SECTIONS.find((s) => s.id === expandedSection)?.label}...
          </div>
        ) : sectionError ? (
          <div className="empty-state">
            <h3>Couldn&apos;t load this section</h3>
            <p className="text-muted">{sectionError}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setSectionRetryToken((t) => t + 1)}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
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
                    <select id="profile-marital-status" name="marital_status" value={basicDetails.marital_status || ''} onChange={handleBasicChange}>
                      <option value="">Select</option>
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
                <div className="family-history">
                  {familyMembers.map((member, index) => (
                    <div key={index} className="language-test-card" style={{ marginTop: '1rem' }}>
                      <div className="language-test-head">
                        <h4>Family Member {index + 1}</h4>
                        {familyMembers.length > 1 && (
                          <button type="button" onClick={() => removeFamilyMember(index)} className="link-danger">Remove</button>
                        )}
                      </div>
                      <div className="form-group">
                        <label htmlFor={`fam-${index}-relation`}>Relation</label>
                        <select id={`fam-${index}-relation`} name="relation" value={member.relation || ''} onChange={(e) => handleFamilyChange(index, e)}>
                          <option value="">Select Relation</option>
                          <option value="Wife">Wife</option>
                          <option value="Husband">Husband</option>
                          <option value="Partner">Partner</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="form-group-row">
                        <div className="form-group">
                          <label htmlFor={`fam-${index}-age`}>Age</label>
                          <input id={`fam-${index}-age`} type="number" name="age" min="0" value={member.age || ''} onChange={(e) => handleFamilyChange(index, e)} />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`fam-${index}-gender`}>Gender</label>
                          <select id={`fam-${index}-gender`} name="gender" value={member.gender || ''} onChange={(e) => handleFamilyChange(index, e)}>
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`fam-${index}-highest_education`}>Highest Education</label>
                        <select id={`fam-${index}-highest_education`} name="highest_education" value={member.highest_education || ''} onChange={(e) => handleFamilyChange(index, e)}>
                          <option value="">Select Level</option>
                          <option value="High School">High School</option>
                          <option value="Diploma">Diploma / Trade Qualification</option>
                          <option value="Bachelor">Bachelor Degree</option>
                          <option value="Masters">Master's Degree</option>
                          <option value="PhD">Doctorate (PhD)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`fam-${index}-citizenship_or_pr`}>Country of Citizenship / PR</label>
                        <select id={`fam-${index}-citizenship_or_pr`} name="citizenship_or_pr" value={member.citizenship_or_pr || ''} onChange={(e) => handleFamilyChange(index, e)}>
                          <option value="">Select Country</option>
                          {countries.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group-row">
                        <div className="form-group">
                          <label htmlFor={`fam-${index}-language_test_type`}>Language Test Type</label>
                          <select id={`fam-${index}-language_test_type`} name="language_test_type" value={member.language_test_type || ''} onChange={(e) => handleFamilyChange(index, e)}>
                            <option value="">None</option>
                            <option value="IELTS">IELTS</option>
                            <option value="PTE">PTE</option>
                            <option value="TOEFL">TOEFL</option>
                            <option value="Cambridge">Cambridge</option>
                            <option value="OET">OET</option>
                          </select>
                        </div>
                        <div className="form-group form-group-last">
                          <label htmlFor={`fam-${index}-language_overall_score`}>Overall Score</label>
                          <input id={`fam-${index}-language_overall_score`} type="number" step="0.5" name="language_overall_score" value={member.language_overall_score || ''} onChange={(e) => handleFamilyChange(index, e)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addFamilyMember} className="btn-dashed">
                    + Add Another Family Member
                  </button>
                </div>
              )}

              {expandedSection === 'education' && (
                <>
                  <div className="education-history">
                    <h3 style={{ marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Detailed Education History</h3>
                    {educationHistory.map((ed, index) => (
                      <div key={index} className="language-test-card" style={{ marginTop: '1rem' }}>
                        <div className="language-test-head">
                          <h4>Qualification {index + 1}</h4>
                          {educationHistory.length > 1 && (
                            <button type="button" onClick={() => removeEducation(index)} className="link-danger">Remove</button>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor={`edu-${index}-level`}>Level</label>
                          <select id={`edu-${index}-level`} name="level" value={ed.level || ''} onChange={(e) => handleEducationChange(index, e)}>
                            <option value="">Select Level</option>
                            <option value="High School">High School</option>
                            <option value="Diploma">Diploma / Trade Qualification</option>
                            <option value="Bachelor">Bachelor Degree</option>
                            <option value="Masters">Master's Degree</option>
                            <option value="Doctorate">Doctorate (PhD)</option>
                            <option value="Unrecognized">Unrecognized</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor={`edu-${index}-uni`}>University / Institution</label>
                          <input id={`edu-${index}-uni`} type="text" name="university_name" value={ed.university_name || ''} onChange={(e) => handleEducationChange(index, e)} />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`edu-${index}-field`}>Field of Study</label>
                          <input id={`edu-${index}-field`} type="text" name="field_of_study" value={ed.field_of_study || ''} onChange={(e) => handleEducationChange(index, e)} />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`edu-${index}-country`}>Country</label>
                          <select id={`edu-${index}-country`} name="country" value={ed.country || ''} onChange={(e) => handleEducationChange(index, e)}>
                            <option value="">Select a country</option>
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label htmlFor={`edu-${index}-start-date`}>Start Date</label>
                            <input id={`edu-${index}-start-date`} type="date" name="start_date" value={ed.start_date || ''} onChange={(e) => handleEducationChange(index, e)} />
                          </div>
                          <div className="form-group">
                            <label htmlFor={`edu-${index}-end-date`}>End Date</label>
                            <input id={`edu-${index}-end-date`} type="date" name="end_date" value={ed.end_date || ''} onChange={(e) => handleEducationChange(index, e)} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addEducation} className="btn-dashed" style={{ marginTop: '1rem' }}>
                      + Add Another Qualification
                    </button>
                  </div>
                </>
              )}

              {expandedSection === 'experience' && (
                <>
                  <div className="experience-history">
                    <h3 style={{ marginTop: '0', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Work Experience</h3>
                    
                    {workExperience.map((we, index) => (
                      <div key={index} className="language-test-card" style={{ marginTop: '1rem' }}>
                        <div className="language-test-head">
                          <h4>Experience {index + 1}</h4>
                          {workExperience.length > 1 && (
                            <button type="button" onClick={() => removeExperience(index)} className="link-danger">Remove</button>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor={`exp-${index}-company`}>Company Name</label>
                          <input id={`exp-${index}-company`} type="text" name="company_name" value={we.company_name || ''} onChange={(e) => handleExperienceChange(index, e)} required />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`exp-${index}-role`}>Role / Position</label>
                          <input id={`exp-${index}-role`} type="text" name="role" value={we.role || ''} onChange={(e) => handleExperienceChange(index, e)} required />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`exp-${index}-country`}>Country</label>
                          <select id={`exp-${index}-country`} name="country" value={we.country || ''} onChange={(e) => handleExperienceChange(index, e)} required>
                            <option value="">Select a country</option>
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label htmlFor={`exp-${index}-start-date`}>Start Date</label>
                            <input id={`exp-${index}-start-date`} type="date" name="start_date" value={we.start_date || ''} onChange={(e) => handleExperienceChange(index, e)} required />
                          </div>
                          <div className="form-group form-group-last">
                            <label htmlFor={`exp-${index}-end-date`}>End Date (Leave blank if current)</label>
                            <input id={`exp-${index}-end-date`} type="date" name="end_date" value={we.end_date || ''} onChange={(e) => handleExperienceChange(index, e)} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addExperience} className="btn-dashed" style={{ marginTop: '1rem' }}>
                      + Add Another Experience
                    </button>
                  </div>

                </>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
            )}
          </>
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
