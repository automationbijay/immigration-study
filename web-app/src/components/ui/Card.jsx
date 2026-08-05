import React from 'react';

/**
 * Surface container. Pass `to`/`onClick` to make it activatable — it then
 * renders as a real <Link>/<button> so it is reachable by keyboard, rather
 * than a <div> with a click handler.
 */
export default function Card({ as, className = '', interactive, children, ...rest }) {
  const isInteractive = interactive ?? Boolean(rest.onClick || rest.href || rest.to);
  const Tag = as ?? (rest.onClick ? 'button' : 'div');
  const classes = ['card', isInteractive ? 'card-interactive' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...(Tag === 'button' ? { type: 'button' } : null)} {...rest}>
      {children}
    </Tag>
  );
}
