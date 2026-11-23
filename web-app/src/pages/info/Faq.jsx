import InfoPage from '../../components/ui/InfoPage';
import PageLink from '../../components/ui/PageLink';

const sections = [
  ['Getting started', [
    ['What does Skilled Migration Assistant do?', <>It estimates your skilled migration points for Australia and Canada. Upload your CV and AI fills in your profile for you, then asks about anything your CV doesn&rsquo;t cover.</>],
    ['Do I have to upload a CV?', <>No. You can use any calculator straight away without an account and answer the questions yourself. Uploading a CV just saves you the typing.</>],
    ['Is it free?', <>Yes. The calculators, lookups and CV import are free to use.</>],
    ['Which countries do you cover?', <>Australia (the points test for subclass 189, 190 and 491 visas) and Canada (the Federal Skilled Worker 67-point grid, plus a link to the official CRS calculator).</>],
  ]],
  ['Your CV and the AI', [
    ['What does the AI read from my CV?', <>Your name, contact details, education, most recent work experience and anything else that affects your points, such as your country of residence. It only records details that are clearly written in the CV. It leaves the rest blank rather than guessing.</>],
    ['Why does it still ask me questions?', <>Most CVs leave out things the points test needs, like your date of birth, English test scores or partner&rsquo;s skills. Instead of making those up, we ask you for just the missing pieces.</>],
    ['Can the AI get things wrong?', <>Yes. AI can misread a layout, mix up dates or miss a qualification. Always check your profile after an import and correct anything that looks off. Your estimate is only as good as the details behind it.</>],
    ['What file types can I upload?', <>A PDF up to 4 MB works best.</>],
    ['Who processes my CV?', <>Your CV is stored securely in our database provider and sent to an AI document-processing service to extract your details. See the <PageLink to="/privacy">privacy policy</PageLink> for the full list.</>],
  ]],
  ['Your results', [
    ['Is my points estimate official?', <>No. It is an estimate based on the published points tables and the answers you give. Only the Australian Department of Home Affairs or Immigration, Refugees and Citizenship Canada (IRCC) can decide your actual score and eligibility.</>],
    ['Does a high score mean I will get a visa?', <>No. Points are one requirement among many. Invitations depend on occupation ceilings, invitation rounds, nomination and health and character checks, and cut-off scores change often.</>],
    ['Should I still talk to a migration agent?', <>For anything that affects a real application, yes. In Australia, look for a registered migration agent on the MARA register. In Canada, look for a licensed consultant (RCIC) or a lawyer.</>],
  ]],
  ['Your account and data', [
    ['How do I delete my data?', <>Open your Profile and choose <strong>Delete All My Data</strong>. This removes your profile, saved estimates and uploaded CV.</>],
    ['Can I replace my CV?', <>Yes. Uploading a new CV replaces the old file.</>],
    ['I found a mistake. How do I tell you?', <>Use the <PageLink to="/contact#report-mistake">Report a mistake</PageLink> form. You don&rsquo;t need an account, and an email address is optional.</>],
    ['Can I work with you?', <>Yes. Migration agents, education providers, data partners and developers can all reach us through the <PageLink to="/contact#collaborate">Collaborate with us</PageLink> form.</>],
  ]],
];

export default function Faq() {
  return (
    <InfoPage
      eyebrow="Help centre"
      title="Questions,"
      accent="answered plainly."
      lede="The things people ask us most about the calculators, the AI that reads your CV, and what to do with your results."
    >
      {sections.map(([heading, items]) => (
        <section key={heading} className="faq-section">
          <h2>{heading}</h2>
          {items.map(([q, a]) => (
            <details key={q} className="faq-item">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      ))}
    </InfoPage>
  );
}
