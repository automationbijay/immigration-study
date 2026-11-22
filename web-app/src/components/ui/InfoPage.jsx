/**
 * Shared layout for the About, FAQ, Contact and legal pages: an eyebrow, a
 * display title with an optional italic accent, a lede, then prose.
 */
export default function InfoPage({ eyebrow, title, accent, lede, updated, children }) {
  return (
    <article className="info-page">
      <header className="info-head">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="info-title">
          {title}{accent && <> <em>{accent}</em></>}
        </h1>
        {lede && <p className="info-lede">{lede}</p>}
        {updated && <p className="info-updated">Last updated {updated}</p>}
      </header>
      <div className="info-body">{children}</div>
    </article>
  );
}
