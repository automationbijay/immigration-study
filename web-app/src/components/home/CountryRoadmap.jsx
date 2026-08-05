import React from 'react';
import { COUNTRIES } from '../../lib/visas';

/**
 * Australia is the MVP. This shows the roadmap without implying the other
 * countries already work.
 */
export default function CountryRoadmap() {
  return (
    <ul className="country-roadmap">
      {COUNTRIES.map((country) => (
        <li key={country.id} className={`country ${country.status}`}>
          <span className="country-code" aria-hidden="true">{country.code}</span>
          <span className="country-name">{country.name}</span>
          <span className="country-status">
            {country.status === 'live' ? 'Available now' : 'Coming soon'}
          </span>
        </li>
      ))}
    </ul>
  );
}
