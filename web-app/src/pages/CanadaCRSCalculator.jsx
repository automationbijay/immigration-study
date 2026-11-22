import PageLink from '../components/ui/PageLink';
import { Calculator } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { officialCrsCalculator } from '../lib/canadaLinks';

export default function CanadaCRSCalculator() {
  return (
    <>
      <PageHeader
        title="Canada Express Entry CRS"
        icon={Calculator}
        backTo="/forms"
        backLabel="Back to Calculators"
        description="Use the Government of Canada calculator to estimate your Express Entry ranking score."
      />
      <PageLink className="btn-primary-large" href={officialCrsCalculator}>Open the official CRS calculator</PageLink>
    </>
  );
}
