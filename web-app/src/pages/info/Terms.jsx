import InfoPage from '../../components/ui/InfoPage';
import PageLink from '../../components/ui/PageLink';
import { LEGAL_UPDATED, SITE_NAME } from '../../lib/site';

export default function Terms() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Terms"
      accent="of use"
      lede={`The rules for using ${SITE_NAME}. By creating an account or using the calculators, you agree to these terms.`}
      updated={LEGAL_UPDATED}
    >
      <h2>1. What the service is</h2>
      <p>
        {SITE_NAME} provides general information and automated points estimates for skilled migration to Australia and
        Canada. It can read a CV you upload using AI and pre-fill your profile. It is an information tool, not a
        migration agency, law firm or government service.
      </p>

      <h2>2. No migration advice</h2>
      <p>
        Nothing in the service is immigration assistance, migration advice or legal advice, and using it does not create
        an agent–client or lawyer–client relationship. Read the <PageLink to="/disclaimer">disclaimer</PageLink> before
        relying on any result.
      </p>

      <h2>3. Your account</h2>
      <ul>
        <li>You must be at least 18 years old to create an account.</li>
        <li>Keep your sign-in details secure. You are responsible for activity on your account.</li>
        <li>Give accurate information. Estimates are only as reliable as the details you provide.</li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        You keep ownership of the CV and details you upload. You give us permission to store and process them,
        including with the AI and service providers described in our <PageLink to="/privacy">privacy policy</PageLink>,
        only to run the service for you. Only upload documents that you have the right to share and that are about you.
      </p>

      <h2>5. AI-generated results</h2>
      <p>
        CV extraction and some suggestions are produced automatically and may be incomplete or wrong. Review your
        profile after every import and correct any errors before you rely on an estimate.
      </p>

      <h2>6. Acceptable use</h2>
      <p>Please don’t:</p>
      <ul>
        <li>use the service to process other people’s documents without their permission;</li>
        <li>try to access other users’ data, or disrupt, overload or reverse-engineer the service;</li>
        <li>scrape the service or resell its results; or</li>
        <li>use it for anything unlawful or misleading, including presenting our estimates as official decisions.</li>
      </ul>
      <p>We may suspend accounts that break these rules.</p>

      <h2>7. Availability and changes</h2>
      <p>
        We may change, pause or stop parts of the service, including the calculators and the AI features, at any time.
        Migration rules change often and our content may lag behind official updates.
      </p>

      <h2>8. Third-party links</h2>
      <p>
        We link to government websites and other resources we don’t control. We aren’t responsible for their content or
        availability.
      </p>

      <h2>9. Liability</h2>
      <p>
        The service is provided “as is”. To the extent the law allows, we are not liable for any loss arising from your
        use of, or reliance on, the service, including visa refusals, missed invitations, fees or lost opportunities.
        Nothing in these terms excludes rights you have under consumer law that can’t be excluded.
      </p>

      <h2>10. Ending your use</h2>
      <p>
        You can stop using the service at any time and delete your data from your Profile page. We may close accounts
        that are inactive or that breach these terms.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        We may update these terms. We will change the date above when we do. If you keep using the service after a change,
        the updated terms apply. Questions? <PageLink to="/contact">Contact us</PageLink>.
      </p>
    </InfoPage>
  );
}
