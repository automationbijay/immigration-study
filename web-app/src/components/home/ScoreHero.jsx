import PageLink from '../ui/PageLink';

export default function ScoreHero({ basePoints, fswRow }) {
  return (
    <section className="dashboard-estimates" aria-labelledby="saved-estimates">
      <h2 id="saved-estimates">Your estimates</h2>
      <div className="country-choices">
        <PageLink className="country-choice" to="/australia-point-calculator">
          <strong className="estimate-country">
            <img src="/images/flag-au.svg" alt="" width="32" height="16" />
            Australia
          </strong>
          <span>Skilled migration base points</span>
          <span className="saved-estimate">{basePoints == null ? 'Start estimate' : `${basePoints} points`}</span>
        </PageLink>
        <PageLink className="country-choice" to="/forms/canada-fsw">
          <strong className="estimate-country">
            <img src="/images/flag-ca.svg" alt="" width="32" height="16" />
            Canada
          </strong>
          <span>Federal Skilled Worker selection points</span>
          <span className="saved-estimate">{fswRow ? `${fswRow.total_points} / 100` : 'Start estimate'}</span>
        </PageLink>
      </div>
    </section>
  );
}
