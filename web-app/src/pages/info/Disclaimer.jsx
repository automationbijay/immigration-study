import { AlertTriangle } from 'lucide-react';
import InfoPage from '../../components/ui/InfoPage';
import PageLink from '../../components/ui/PageLink';
import { LEGAL_UPDATED, SITE_NAME } from '../../lib/site';

export default function Disclaimer() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Please read this"
      accent="before you rely on a result."
      updated={LEGAL_UPDATED}
    >
      <div className="info-callout" role="note">
        <AlertTriangle size={22} aria-hidden="true" />
        <p>
          {SITE_NAME} gives <strong>general information and estimates only</strong>. It is not migration advice,
          immigration assistance or legal advice, and it is not affiliated with any government.
        </p>
      </div>

      <h2>Not a registered migration agent or licensed consultant</h2>
      <p>
        We are not registered migration agents in Australia and not licensed immigration consultants or lawyers in
        Canada. In Australia, only registered migration agents and legal practitioners may give immigration assistance
        (Migration Act 1958, section 276). In Canada, only authorised representatives may give paid immigration advice.
        For advice about your own situation, consult a registered migration agent (check the{' '}
        <a href="https://portal.mara.gov.au/search-the-register-of-migration-agents/">MARA register</a>) or a licensed
        consultant or lawyer (check the{' '}
        <a href="https://college-ic.ca/protecting-the-public/find-an-immigration-consultant">College of Immigration and Citizenship Consultants</a>).
      </p>

      <h2>Not affiliated with government</h2>
      <p>
        We are independent. We are not part of, endorsed by or connected with the Australian Department of Home Affairs,
        Immigration, Refugees and Citizenship Canada (IRCC) or any state, territory or provincial government.
      </p>

      <h2>Estimates are not decisions</h2>
      <ul>
        <li>Points are calculated from published points tables and the answers in your profile. Only the relevant government can decide your real score.</li>
        <li>A points estimate is not an assessment of eligibility. Visas also depend on age limits, occupation lists, skills assessments, English requirements, nomination, invitation rounds, health and character checks, and more.</li>
        <li>Invitation cut-offs and occupation ceilings change from round to round. Any figures shown may be out of date.</li>
      </ul>

      <h2>AI can make mistakes</h2>
      <p>
        When you upload a CV, AI extracts your details automatically. It can misread dates, qualifications or job titles,
        or miss information altogether. Check every field it fills in, and answer its follow-up questions accurately.
        Wrong inputs give wrong estimates.
      </p>

      <h2>Rules change</h2>
      <p>
        Migration law and policy change often and sometimes without notice. We try to keep our content current, but we
        can’t guarantee it is complete, accurate or up to date. Always confirm requirements on{' '}
        <a href="https://immi.homeaffairs.gov.au">immi.homeaffairs.gov.au</a> or{' '}
        <a href="https://www.canada.ca/en/immigration-refugees-citizenship.html">canada.ca</a> before you act, pay fees
        or lodge an application.
      </p>

      <h2>No liability</h2>
      <p>
        To the extent the law allows, we accept no liability for decisions you make, or losses you suffer, from relying on
        this service. See our <PageLink to="/terms">terms of use</PageLink> for the full terms.
      </p>
    </InfoPage>
  );
}
