import './viz.css';

import { useCallback, useRef, useState, type ReactNode } from 'react';

/** Theme used by every Syncfusion data-visualization component in the sample. */
export const THEME = 'Tailwind3' as const;

export const tierColor = {
  Supplier: '#2563eb',
  Plant: '#7c3aed',
  DC: '#0d9488',
  Channel: '#ea580c',
} as const;

/**
 * Measures how long a Syncfusion component takes to render.
 * Wire `onLoad` to the component's `load` event and `onLoaded` to its `loaded` event.
 */
export function useRenderTimer() {
  const start = useRef(0);
  const [ms, setMs] = useState<number | null>(null);
  const onLoad = useCallback(() => { start.current = performance.now(); }, []);
  const onLoaded = useCallback(() => {
    if (start.current) setMs(Math.round(performance.now() - start.current));
    start.current = 0;
  }, []);
  return { ms, onLoad, onLoaded };
}

export function RenderMetric({ ms, label = 'Render time' }: { ms: number | null; label?: string }) {
  return (
    <span className="metric" title="Measured in this browser between the component's load and loaded events">
      {label}: <b>{ms == null ? '…' : `${ms.toLocaleString()} ms`}</b>
    </span>
  );
}

export function Expectation({ children }: { children: ReactNode }) {
  return <div className="expectation"><strong>Customer expectation → </strong>{children}</div>;
}

export function Card({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {right && <div className="controls">{right}</div>}
      </div>
      {children}
    </section>
  );
}

export const fmt = (n: number) => n.toLocaleString('en-US');
