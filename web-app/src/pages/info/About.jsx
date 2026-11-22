import { FileUp, MessageCircleQuestion, Gauge } from 'lucide-react';
import InfoPage from '../../components/ui/InfoPage';
import PageLink from '../../components/ui/PageLink';

const steps = [
  { icon: FileUp, title: 'Upload your CV', body: 'Drop in your resume as a PDF. That is the only form you have to fill in to get started.' },
  { icon: MessageCircleQuestion, title: 'AI reads it, then asks', body: 'AI pulls out your education, work history and personal details, fills in your profile, and asks you only about what your CV leaves out, like your date of birth or English test scores.' },
  { icon: Gauge, title: 'See where you stand', body: 'Your profile feeds every calculator, so you can compare Australian and Canadian pathways without typing the same details twice.' },
];

export default function About({ session }) {
  return (
    <InfoPage
      eyebrow="About us"
      title="Migration paperwork,"
      accent="minus the paperwork."
      lede="Points tests are written for lawyers and case officers. We built Skilled Migration Assistant so you can see where you stand in minutes, starting from the CV you already have."
    >
      <h2>Why we built this</h2>
      <p>
        Working out your skilled migration points usually means reading several government pages, a points table
        and a list of occupation codes, then guessing how your own history fits. Most people do it more than once,
        for more than one country. We think the first step should be as simple as uploading a document.
      </p>

      <h2>How it works</h2>
      <ol className="info-steps">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <li key={title}>
            <span className="info-step-icon"><Icon size={22} aria-hidden="true" /></span>
            <span className="info-step-num">Step {i + 1}</span>
            <strong>{title}</strong>
            <span>{body}</span>
          </li>
        ))}
      </ol>

      <h2>What we cover</h2>
      <ul>
        <li>The Australian points test used for the Skilled Independent (189), Skilled Nominated (190) and Skilled Work Regional (491) visas.</li>
        <li>Canada&rsquo;s Federal Skilled Worker 67-point selection grid, with a link to the official Comprehensive Ranking System (CRS) calculator.</li>
        <li>Occupation and university lookups to help you prepare for a skills assessment.</li>
      </ul>

      <h2>What we are not</h2>
      <p>
        We are not a migration agency, and we do not lodge applications or give advice about your individual case.
        Our estimates are a starting point to help you ask better questions. The official rules and a registered
        professional always have the final say. Read our <PageLink to="/disclaimer">disclaimer</PageLink> for the details.
      </p>

      <div className="info-cta">
        <PageLink to={session ? '/profile?intent=upload_cv' : '/signup?intent=upload_cv'} className="btn-primary btn-compact">Upload your CV</PageLink>
        <PageLink to="/faq">Read the FAQ</PageLink>
      </div>
    </InfoPage>
  );
}
