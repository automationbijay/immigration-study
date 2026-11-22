import { Globe } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import VisaFormCard from '../components/VisaFormCard';
import { australianVisas } from '../lib/visaDirectory';

export default function VisasHub() {
  return (
    <>
      <PageHeader
        title="Australia’s points-tested skilled visas"
        icon={Globe}
        backTo="/discover"
        backLabel="Back to Discover"
        description="Compare subclasses 189, 190 and 491. Open each pathway for its official requirements from Home Affairs."
      />
      <div className="card-grid">
        {australianVisas.map(({ subclass, ...visa }) => (
          <VisaFormCard key={subclass} {...visa} countryCode="au" />
        ))}
      </div>
    </>
  );
}
