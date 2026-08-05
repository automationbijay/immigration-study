import React from 'react';
import { User, Briefcase, GraduationCap, Award } from 'lucide-react';
import {
    AGE_BANDS,
    ENGLISH_BANDS,
    OVERSEAS_EXP_BANDS,
    AUS_EXP_BANDS,
    EDUCATION_BANDS,
    PARTNER_SKILLS_BANDS,
    MAX_WORK_EXPERIENCE_POINTS,
    bandIdForYears,
    yearsForBandId,
    optionLabel,
} from '../lib/points';

const SectionHeader = ({ icon: Icon, title }) => (
    <div className="points-section-header">
        <span className="icon-tile">
            <Icon size={20} aria-hidden="true" />
        </span>
        <h3>{title}</h3>
    </div>
);

const BandSelect = ({ id, name, label, bands, value, onChange }) => (
    <div className="form-group">
        <label htmlFor={id}>{label}</label>
        <select id={id} value={value} onChange={(e) => onChange(name, e.target.value)}>
            {bands.map((band) => (
                <option key={band.id} value={band.id}>{optionLabel(band)}</option>
            ))}
        </select>
    </div>
);

const SwitchRow = ({ id, name, label, checked, onChange }) => (
    <div className="form-group switch-group">
        <label htmlFor={id}>{label}</label>
        <label className="switch">
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={(e) => onChange(name, e.target.checked)}
            />
            <span className="slider"></span>
        </label>
    </div>
);

const PointsForm = ({ formData, onChange }) => (
    <form id="points-form">

        {/* Personal Details */}
        <div className="points-panel">
            <SectionHeader icon={User} title="Personal Details" />

            <BandSelect
                id="age" name="ageBand" label="Age"
                bands={AGE_BANDS} value={formData.ageBand} onChange={onChange}
            />
            <BandSelect
                id="english" name="englishBand" label="English Language Skills"
                bands={ENGLISH_BANDS} value={formData.englishBand} onChange={onChange}
            />
        </div>

        {/* Employment — stored as years, scored as points */}
        <div className="points-panel">
            <SectionHeader icon={Briefcase} title="Skilled Employment (Past 10 Years)" />

            <BandSelect
                id="overseas-exp" name="overseasExpYears" label="Overseas Employment"
                bands={OVERSEAS_EXP_BANDS}
                value={bandIdForYears(OVERSEAS_EXP_BANDS, formData.overseasExpYears)}
                onChange={(name, bandId) => onChange(name, yearsForBandId(OVERSEAS_EXP_BANDS, bandId))}
            />

            <div className="form-group">
                <label htmlFor="aus-exp">Australian Employment</label>
                <select
                    id="aus-exp"
                    value={bandIdForYears(AUS_EXP_BANDS, formData.ausExpYears)}
                    onChange={(e) => onChange('ausExpYears', yearsForBandId(AUS_EXP_BANDS, e.target.value))}
                >
                    {AUS_EXP_BANDS.map((band) => (
                        <option key={band.id} value={band.id}>{optionLabel(band)}</option>
                    ))}
                </select>
                <small className="field-hint">
                    * Maximum combined work experience points is {MAX_WORK_EXPERIENCE_POINTS}.
                </small>
            </div>
        </div>

        {/* Education */}
        <div className="points-panel">
            <SectionHeader icon={GraduationCap} title="Education & Study" />

            <BandSelect
                id="education" name="educationBand" label="Educational Qualifications"
                bands={EDUCATION_BANDS} value={formData.educationBand} onChange={onChange}
            />

            <SwitchRow
                id="specialist-edu" name="specialistEdu"
                label="Specialist Educational Qualification (STEM Masters by Research/PhD in AU)"
                checked={formData.specialistEdu} onChange={onChange}
            />
            <SwitchRow
                id="aus-study" name="ausStudy"
                label="Australian Study Requirement (at least 2 academic years)"
                checked={formData.ausStudy} onChange={onChange}
            />
            <SwitchRow
                id="professional-year" name="professionalYear"
                label="Professional Year in Australia"
                checked={formData.professionalYear} onChange={onChange}
            />
            <SwitchRow
                id="regional-study" name="regionalStudy"
                label="Study in Regional Australia"
                checked={formData.regionalStudy} onChange={onChange}
            />
        </div>

        {/* Additional Criteria */}
        <div className="points-panel">
            <SectionHeader icon={Award} title="Additional Criteria" />

            <BandSelect
                id="partner-skills" name="partnerSkillsBand" label="Partner Skills"
                bands={PARTNER_SKILLS_BANDS} value={formData.partnerSkillsBand} onChange={onChange}
            />

            <SwitchRow
                id="ccl" name="ccl"
                label="Credentialled Community Language (CCL)"
                checked={formData.ccl} onChange={onChange}
            />
        </div>

    </form>
);

export default PointsForm;
