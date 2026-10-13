import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Props = {
  title: string;
  description: string;
  endpoint: string;
  dataKey: string;
  emptyText: string;
};
type RecordItem = Record<string, unknown>;
type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; items: RecordItem[] };

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function CapabilityCard({ title, description, endpoint, dataKey, emptyText }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<Record<string, unknown>>(endpoint)
      .then((payload) => {
        const items = payload[dataKey];
        if (!Array.isArray(items)) throw new Error('Unexpected API response');
        if (active) setState({ status: 'success', items: items as RecordItem[] });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => { active = false; };
  }, [dataKey, endpoint]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {state.status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
        {state.status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}.</p>}
        {state.status === 'success' && state.items.length === 0 && <p>{emptyText}</p>}
        {state.status === 'success' && state.items.length > 0 && (
          <ul className="list-group">
            {state.items.map((item, index) => (
              <li className="list-group-item d-flex flex-wrap gap-3" key={String(item._id ?? item.email ?? item.title ?? index)}>
                {Object.entries(item)
                  .filter(([field, value]) => field !== '_id' && field !== '__v' && value !== null && value !== undefined)
                  .map(([field, value]) => (
                    <span key={field}><strong>{field}:</strong> {displayValue(value)}</span>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
