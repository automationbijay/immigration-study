import React from 'react';

export function Skeleton({ width = '100%', height = '1rem', radius = 'var(--radius-md)', style }) {
  return (
    <span
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/**
 * Placeholder shown while a page loads. `aria-busy` plus a visually hidden
 * label means screen readers announce the wait instead of reading empty boxes.
 */
export function SkeletonPage({ lines = 3, label = 'Loading' }) {
  return (
    <div className="skeleton-page" role="status" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      <Skeleton height="2rem" width="60%" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="5rem" radius="var(--radius-lg)" />
      ))}
    </div>
  );
}

export default Skeleton;
