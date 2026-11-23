import InfoPage from '../../components/ui/InfoPage';
import FeedbackForm from '../../components/FeedbackForm';
import { CONTACT_EMAIL } from '../../lib/site';

export default function Contact() {
  return (
    <InfoPage
      title="Feedback and collaboration"
      lede="Report a mistake, suggest an improvement or tell us how you’d like to work together."
    >
      <span id="report-mistake" />
      <span id="collaborate" />
      <FeedbackForm initialKind="collaborate" />

      {CONTACT_EMAIL && (
        <p className="contact-email">
          Prefer email? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We usually reply within a few working days.
        </p>
      )}

      <h2>Need help with your application?</h2>
      <p>
        For advice about your own circumstances, speak to a registered migration agent in Australia (search the{' '}
        <a href="https://portal.mara.gov.au/search-the-register-of-migration-agents/">MARA register</a>) or a
        licensed immigration consultant in Canada (search the{' '}
        <a href="https://college-ic.ca/protecting-the-public/find-an-immigration-consultant">College of Immigration and Citizenship Consultants</a>).
      </p>
    </InfoPage>
  );
}
