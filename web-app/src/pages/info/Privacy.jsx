import InfoPage from '../../components/ui/InfoPage';
import PageLink from '../../components/ui/PageLink';
import { LEGAL_UPDATED, SITE_NAME } from '../../lib/site';

export default function Privacy() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Privacy"
      accent="policy"
      lede={`How ${SITE_NAME} collects, uses and protects your information, including the CV you upload.`}
      updated={LEGAL_UPDATED}
    >
      <h2>The short version</h2>
      <ul>
        <li>We collect what you give us (your CV and your answers) so we can estimate your points.</li>
        <li>AI reads your CV to fill in your profile. It runs on a third-party service that processes the file on our behalf.</li>
        <li>We don’t sell your information or use it for advertising.</li>
        <li>You can delete your profile, estimates and CV at any time from your Profile page.</li>
      </ul>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your email address and, if you sign in with Google, your name and profile picture from Google.</li>
        <li><strong>Your CV:</strong> the file you upload and the details extracted from it, such as your name, contact details, date of birth (if your CV states it), education, work history and country of residence.</li>
        <li><strong>Profile answers:</strong> details you enter or confirm, such as age, English test scores, qualifications, work experience, partner details and occupation.</li>
        <li><strong>Saved estimates:</strong> the points results you choose to save.</li>
        <li><strong>Messages you send us:</strong> mistake reports and contact or collaboration requests, including any name, email address and organisation you choose to give, and the page you were on.</li>
        <li><strong>Technical data:</strong> error reports and performance data, including occasional session recordings used to diagnose problems.</li>
      </ul>
      <p>You can use the calculators without an account. If you aren’t signed in, your calculator answers are worked out in your browser and aren’t sent to us or saved.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To read your CV and pre-fill your profile, then ask you for anything missing.</li>
        <li>To calculate and save your points estimates and suggest relevant pathways.</li>
        <li>To keep the service secure, fix bugs and improve accuracy.</li>
        <li>To reply when you contact us, and to fix the mistakes you report.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We share information only with service providers that help us run the app, and only as much as they need:</p>
      <ul>
        <li><strong>Supabase</strong>: database, sign-in and file storage for your profile, your CV and the messages you send us.</li>
        <li><strong>LlamaIndex (LlamaCloud)</strong>: AI document processing that reads your CV and extracts your details.</li>
        <li><strong>Google</strong>: sign-in, if you choose “Continue with Google”.</li>
        <li><strong>Sentry</strong>: error monitoring and diagnostic session replays.</li>
      </ul>
      <p>
        These providers may store or process data outside your country. We may also disclose information if the law
        requires it. We never sell your personal information.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your profile, estimates and CV until you delete them or ask us to. Uploading a new CV replaces the old
        file. Error reports are kept for a limited period by our monitoring provider.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>Access and correction:</strong> view and edit your details at any time on your Profile page.</li>
        <li><strong>Deletion:</strong> choose <strong>Delete All My Data</strong> on your Profile page to remove your profile, saved estimates and uploaded CV. To close your login as well, <PageLink to="/contact">contact us</PageLink>.</li>
        <li><strong>Questions or complaints:</strong> <PageLink to="/contact">contact us</PageLink> first. You may also complain to the privacy regulator where you live.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Your CV is kept in private storage and is only shared through short-lived links. Access to your data is limited to
        your own account. No online service is perfectly secure, so please don’t upload documents containing passport
        numbers, bank details or other information we don’t need.
      </p>

      <h2>Children</h2>
      <p>The service is meant for adults planning their own migration. Don’t use it if you are under 18.</p>

      <h2>Changes to this policy</h2>
      <p>If we change this policy we will update the date above. Significant changes will be highlighted in the app.</p>
    </InfoPage>
  );
}
