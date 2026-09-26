import React from 'react';
import { Globe } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import VisaFormCard from '../components/VisaFormCard';

export default function VisasHub() {
  return (
    <>
      <PageHeader 
        title="Skilled Visas" 
        icon={Globe} 
        backTo="/discover" 
        backLabel="Back to Discover" 
      />

      <div style={{ padding: '0 var(--spacing-4) var(--spacing-6)', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
        <p>
          The Skilled stream is the largest component of Australia's permanent Migration Program, built to address labour market gaps and grow the skilled workforce. Most pathways here are either points-tested through SkillSelect — where applicants submit an Expression of Interest and compete for an invitation based on age, English proficiency, work experience, and qualifications — or employer-sponsored, where a specific business nominates a worker for a role it can't fill locally. Provisional visas like 491 and 494 come with a regional work requirement and a defined pathway to permanent residency once that requirement is met.
        </p>
      </div>

      <div className="card-grid">
        <VisaFormCard 
          title="Subclass 189"
          description="Skilled — Independent. Points-tested, no sponsor needed. Permanent residency."
          to="#"
          countryCode="au"
          colorBg="var(--color-surface)"
          colorText="var(--color-primary)"
        />
        <VisaFormCard 
          title="Subclass 190"
          description="Skilled — Nominated. Points-tested, nominated by a state/territory government."
          to="#"
          countryCode="au"
          colorBg="var(--color-surface)"
          colorText="var(--color-primary)"
        />
        <VisaFormCard 
          title="Subclass 491"
          description="Skilled — Regional (Provisional). 5-year provisional for regional areas. Pathway to PR via 191."
          to="#"
          countryCode="au"
          colorBg="var(--color-surface)"
          colorText="var(--color-primary)"
        />
        <VisaFormCard 
          title="Subclass 482"
          description="Temporary Skill Shortage (TSC). Employer-sponsored, up to 4 years. Medium-term and short-term streams."
          to="#"
          countryCode="au"
          colorBg="var(--color-surface)"
          colorText="var(--color-primary)"
        />
        <VisaFormCard 
          title="Subclass 494"
          description="Employer Sponsored Regional (Prov.). Employer-sponsored work in designated regional areas."
          to="#"
          countryCode="au"
          colorBg="var(--color-surface)"
          colorText="var(--color-primary)"
        />
        <VisaFormCard 
          title="Subclass 186"
          description="Employer Nomination Scheme. Permanent employer-sponsored visa for skilled workers."
          to="#"
          countryCode="au"
          colorBg="var(--color-surface)"
          colorText="var(--color-primary)"
        />
        <VisaFormCard 
          title="Subclass 407"
          description="Training Visa. Occupational or workplace-based training programs."
          to="#"
          countryCode="au"
          colorBg="var(--color-surface)"
          colorText="var(--color-primary)"
        />
      </div>
    </>
  );
}
