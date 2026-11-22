const visaListing = 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing';

export const australianVisas = [
  ['189', 'Skilled Independent', 'Permanent, points-tested visa for invited skilled workers.', 'skilled-independent-189/points-tested'],
  ['190', 'Skilled Nominated', 'Permanent visa for skilled workers nominated by a state or territory.', 'skilled-nominated-190'],
  ['491', 'Skilled Work Regional', 'Provisional regional visa with state or territory nomination or eligible family sponsorship.', 'skilled-work-regional-provisional-491'],
].map(([subclass, name, description, path]) => ({
  subclass,
  title: `${name} (subclass ${subclass})`,
  description,
  href: `${visaListing}/${path}`,
}));
