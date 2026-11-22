import PageLink from '../components/ui/PageLink';
import PageHeader from '../components/ui/PageHeader';
import VisaFormCard from '../components/VisaFormCard';
import ToolCard from '../components/ToolCard';
import { useProfile } from '../lib/ProfileContext';
import { officialCrsCalculator } from '../lib/canadaLinks';
import { australianVisas } from '../lib/visaDirectory';

export default function Discover() {
  const { totalPoints, fswRow } = useProfile();

  return (
    <>
      <PageHeader title="Points-tested skilled immigration" description="Choose a country to estimate your points or review the program requirements." />
      <section className="section" id="australia">
        <div className="section-header">
          <h2 className="section-title">Australia</h2>
          <PageLink to="/visas" className="link-button">All Australian pathways</PageLink>
        </div>
        <div className="card-grid">
          <VisaFormCard
            title="Australian skilled migration points"
            description="See how your age, English, education and work experience contribute to your points."
            score={totalPoints}
            to="/australia-point-calculator"
            countryCode="au"
          />
          {australianVisas.map(({ subclass, ...visa }) => (
            <VisaFormCard key={subclass} {...visa} countryCode="au" />
          ))}
        </div>
      </section>

      <section className="section" id="canada">
        <div className="section-header">
          <h2 className="section-title">Canada</h2>
        </div>
        <div className="card-grid">
          <VisaFormCard
            title="Estimate Federal Skilled Worker points"
            description="See how your profile scores on Canada’s Federal Skilled Worker selection grid."
            score={fswRow?.total_points}
            to="/forms/canada-fsw"
            countryCode="ca"
          />
          <VisaFormCard
            title="Open Canada’s official CRS calculator"
            description="Estimate the score Canada uses to rank Express Entry profiles with the official IRCC calculator."
            href={officialCrsCalculator}
            countryCode="ca"
          />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Lookup tools</h2>
          <PageLink to="/tools" className="link-button">All lookup tools</PageLink>
        </div>
        <div className="card-grid">
          <ToolCard title="ANZSCO occupation finder" description="Search occupation titles and codes." to="/tools/anzsco" />
          <ToolCard title="University directory" description="Look up an institution by name." to="/tools/university" />
        </div>
      </section>
    </>
  );
}
