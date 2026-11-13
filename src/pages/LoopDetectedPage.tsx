import React, { useEffect, useState } from 'react';

/*
 * /loop-detected is served by the server (api/loop-detected.js in production,
 * a Vite middleware in dev), not by this component: it streams a document that
 * never finishes, so DOMContentLoaded, load and network idle never happen.
 *
 * This component only runs when the app reaches the route without a full page
 * load (a client-side link, e.g. from /playground). It then does a full page
 * load so the server handles the request.
 */
const LoopDetectedPage: React.FC = () => {
  // A full page load of /loop-detected that still landed here means the server
  // handler is missing; reloading would only loop on an ordinary page.
  const landedHere = (() => {
    const nav = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
    return !!nav && new URL(nav.name).pathname.replace(/\/$/, '') === '/loop-detected';
  })();
  const [message] = useState(landedHere
    ? 'The /loop-detected server handler is not active on this host, so the page cannot loop.'
    : 'Entering the loop…');

  useEffect(() => {
    if (!landedHere) window.location.replace('/loop-detected');
  }, [landedHere]);

  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
      <p style={{ margin: 0, color: 'var(--color-neutral-800)' }}>{message}</p>
    </div>
  );
};

export default LoopDetectedPage;
