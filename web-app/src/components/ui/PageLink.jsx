import { Link } from 'react-router-dom';

export default function PageLink({ as: Tag = Link, href, children, ...props }) {
  const Element = href ? 'a' : Tag;
  return <Element {...props} href={href}>{children}</Element>;
}
