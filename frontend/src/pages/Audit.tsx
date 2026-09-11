import { useEffect, useMemo, useState } from "react";
import { getAuditEvents } from "../services/audit";
import type { AuditEvent, AuditResponse } from "../types/api";
import Icon from "../components/ui/Icon";

function shorten(value: string, start = 10, end = 8) {
  if (!value || value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString();
}

function EventData({ event }: { event: AuditEvent }) {
  return (
    <details className="audit-details">
      <summary>View event data</summary>
      <pre>{JSON.stringify(event.data, null, 2)}</pre>
    </details>
  );
}

export default function Audit() {
  const [response, setResponse] = useState<AuditResponse | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAudit() {
      try {
        setLoading(true);
        setError("");
        const result = await getAuditEvents();

        if (!active) return;

        setResponse(result);
        setEvents(result.events);
      } catch {
        if (active) {
          setError("Unable to load the audit log. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAudit();

    return () => {
      active = false;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;

    return events.filter((event) =>
      [
        event.event_name,
        event.transaction_hash,
        event.contract_address,
        String(event.block_number),
        String(event.log_index),
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [events, search]);

  return (
    <main className="page audit-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">IMMUTABLE RECORD</span>
          <h1>Audit Log</h1>
          <p>
            Verifiable blockchain events indexed by TrustLayer for security and
            accountability.
          </p>
        </div>

        <div className="audit-status">
          <span className="status-dot" />
          {response?.status === "ready" ? "Service ready" : "Audit service"}
        </div>
      </div>

      <section className="audit-summary-grid">
        <article className="card audit-summary-card">
          <div className="audit-summary-icon">
            <Icon name="database" size={20} />
          </div>
          <div>
            <span>Total events</span>
            <strong>{loading ? "—" : response?.count ?? 0}</strong>
          </div>
        </article>

        <article className="card audit-summary-card">
          <div className="audit-summary-icon">
            <Icon name="check" size={20} />
          </div>
          <div>
            <span>Integrity status</span>
            <strong>Verified</strong>
          </div>
        </article>

        <article className="card audit-summary-card">
          <div className="audit-summary-icon">
            <Icon name="shield" size={20} />
          </div>
          <div>
            <span>Record type</span>
            <strong>On-chain</strong>
          </div>
        </article>
      </section>

      <section className="card audit-panel">
        <div className="audit-toolbar">
          <div>
            <h2>Event history</h2>
            <p>
              {loading
                ? "Loading indexed events..."
                : `${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"} shown`}
            </p>
          </div>

          <label className="audit-search">
            <Icon name="search" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events, transaction, block..."
              aria-label="Search audit events"
            />
          </label>
        </div>

        {loading && (
          <div className="audit-loading" aria-label="Loading audit events">
            {[1, 2, 3, 4].map((item) => (
              <div className="audit-skeleton-row" key={item}>
                <span />
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="audit-state audit-error-state">
            <Icon name="shield" size={24} />
            <h3>Audit log unavailable</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="audit-state">
            <Icon name="database" size={28} />
            <h3>No audit events yet</h3>
            <p>
              Indexed blockchain activity will appear here when events are
              recorded.
            </p>
          </div>
        )}

        {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
          <div className="audit-state">
            <Icon name="search" size={28} />
            <h3>No matching events</h3>
            <p>Try a different event name, transaction hash, or block number.</p>
          </div>
        )}

        {!loading && !error && filteredEvents.length > 0 && (
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Transaction</th>
                  <th>Contract</th>
                  <th>Block</th>
                  <th>Log index</th>
                  <th>Timestamp</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event, index) => (
                  <tr key={`${event.transaction_hash}:${event.log_index}:${index}`}>
                    <td>
                      <div className="audit-event-name">
                        <span className="audit-event-marker" />
                        <strong>{event.event_name}</strong>
                      </div>
                    </td>
                    <td>
                      <code>{shorten(event.transaction_hash)}</code>
                    </td>
                    <td>
                      <code>{shorten(event.contract_address)}</code>
                    </td>
                    <td>{event.block_number}</td>
                    <td>{event.log_index}</td>
                    <td>{formatTimestamp(event.timestamp)}</td>
                    <td>
                      <EventData event={event} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
