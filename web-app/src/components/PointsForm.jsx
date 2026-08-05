import React from 'react';
import { User, Briefcase, GraduationCap, Award } from 'lucide-react';

const PointsForm = ({ formData, handleInputChange }) => {
    
    const SectionHeader = ({ icon: Icon, title }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ background: 'rgba(161, 98, 7, 0.1)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--color-accent)' }}>
                <Icon size={20} />
            </div>
            <h3 style={{ fontSize: '1.125rem', color: 'var(--color-primary)', fontWeight: 'bold', margin: 0 }}>{title}</h3>
        </div>
    );

    return (
        <form id="points-form">
            
            {/* Personal Details */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '1rem' }}>
                <SectionHeader icon={User} title="Personal Details" />
                
                <div className="form-group">
                    <label htmlFor="age">Age</label>
                    <select id="age" name="age" value={formData.age} onChange={handleInputChange}>
                        <option value="0">Select your age group</option>
                        <option value="25">18 - 24 years (25 pts)</option>
                        <option value="30">25 - 32 years (30 pts)</option>
                        <option value="25">33 - 39 years (25 pts)</option>
                        <option value="15">40 - 44 years (15 pts)</option>
                        <option value="0">45 years and over (0 pts)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="english">English Language Skills</label>
                    <select id="english" name="english" value={formData.english} onChange={handleInputChange}>
                        <option value="0">Competent (0 pts)</option>
                        <option value="10">Proficient (10 pts)</option>
                        <option value="20">Superior (20 pts)</option>
                    </select>
                </div>
            </div>

            {/* Employment */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '1rem' }}>
                <SectionHeader icon={Briefcase} title="Skilled Employment (Past 10 Years)" />
                
                <div className="form-group">
                    <label htmlFor="overseas-exp">Overseas Employment</label>
                    <select id="overseas-exp" name="overseasExp" value={formData.overseasExp} onChange={handleInputChange}>
                        <option value="0">Less than 3 years (0 pts)</option>
                        <option value="5">3 - 4 years (5 pts)</option>
                        <option value="10">5 - 7 years (10 pts)</option>
                        <option value="15">8 years or more (15 pts)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="aus-exp">Australian Employment</label>
                    <select id="aus-exp" name="ausExp" value={formData.ausExp} onChange={handleInputChange}>
                        <option value="0">Less than 1 year (0 pts)</option>
                        <option value="5">1 - 2 years (5 pts)</option>
                        <option value="10">3 - 4 years (10 pts)</option>
                        <option value="15">5 - 7 years (15 pts)</option>
                        <option value="20">8 years or more (20 pts)</option>
                    </select>
                    <small style={{ color: 'var(--color-secondary)', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>* Maximum combined work experience points is 20.</small>
                </div>
            </div>

            {/* Education */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '1rem' }}>
                <SectionHeader icon={GraduationCap} title="Education & Study" />
                
                <div className="form-group">
                    <label htmlFor="education">Educational Qualifications</label>
                    <select id="education" name="education" value={formData.education} onChange={handleInputChange}>
                        <option value="0">None</option>
                        <option value="20">Doctorate from AU or recognised standard (20 pts)</option>
                        <option value="15">Bachelor/Masters from AU or recognised (15 pts)</option>
                        <option value="10">Diploma/Trade qualification in AU (10 pts)</option>
                        <option value="10">Attained recognised award/qualification (10 pts)</option>
                        <option value="5">Any lesser qualification recognised by assessment (5 pts)</option>
                    </select>
                </div>

                <div className="form-group switch-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="specialist-edu" style={{ margin: 0, maxWidth: '80%' }}>Specialist Educational Qualification (STEM Masters by Research/PhD in AU)</label>
                    <label className="switch">
                        <input type="checkbox" id="specialist-edu" name="specialistEdu" checked={formData.specialistEdu} onChange={handleInputChange} />
                        <span className="slider round"></span>
                    </label>
                </div>

                <div className="form-group switch-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <label htmlFor="aus-study" style={{ margin: 0, maxWidth: '80%' }}>Australian Study Requirement (at least 2 academic years)</label>
                    <label className="switch">
                        <input type="checkbox" id="aus-study" name="ausStudy" checked={formData.ausStudy} onChange={handleInputChange} />
                        <span className="slider round"></span>
                    </label>
                </div>

                <div className="form-group switch-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <label htmlFor="professional-year" style={{ margin: 0, maxWidth: '80%' }}>Professional Year in Australia</label>
                    <label className="switch">
                        <input type="checkbox" id="professional-year" name="professionalYear" checked={formData.professionalYear} onChange={handleInputChange} />
                        <span className="slider round"></span>
                    </label>
                </div>

                <div className="form-group switch-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <label htmlFor="regional-study" style={{ margin: 0, maxWidth: '80%' }}>Study in Regional Australia</label>
                    <label className="switch">
                        <input type="checkbox" id="regional-study" name="regionalStudy" checked={formData.regionalStudy} onChange={handleInputChange} />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>

            {/* Additional Criteria */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '1rem' }}>
                <SectionHeader icon={Award} title="Additional Criteria" />
                
                <div className="form-group">
                    <label htmlFor="partner-skills">Partner Skills</label>
                    <select id="partner-skills" name="partnerSkills" value={formData.partnerSkills} onChange={handleInputChange}>
                        <option value="0">Not applicable (0 pts)</option>
                        <option value="10">Single / Partner is Australian citizen/PR (10 pts)</option>
                        <option value="10">Partner has competent English and skills assessment (10 pts)</option>
                        <option value="5">Partner has competent English (no skills assessment) (5 pts)</option>
                    </select>
                </div>

                <div className="form-group switch-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <label htmlFor="ccl" style={{ margin: 0, maxWidth: '80%' }}>Credentialled Community Language (CCL)</label>
                    <label className="switch">
                        <input type="checkbox" id="ccl" name="ccl" checked={formData.ccl} onChange={handleInputChange} />
                        <span className="slider round"></span>
                    </label>
                </div>

                <div className="form-group switch-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                    <div>
                        <label htmlFor="state-nomination" style={{ margin: 0 }}>State/Territory Nomination (Subclass 190)</label>
                        <small style={{ color: 'var(--color-secondary)', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>Automatically gives 5 points for subclass 190.</small>
                    </div>
                    <label className="switch">
                        <input type="checkbox" id="state-nomination" name="stateNomination" checked={true} disabled />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>
            
        </form>
    );
};

export default PointsForm;
