import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatCard from "../components/ui/StatCard";
import StatusBadge from "../components/ui/StatusBadge";
import { getAuditEvents } from "../services/audit";
import type { AuditEvent } from "../types/api";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 20 6v5c0 5-3.2 8-8 10-4.8-2-8-5-8-10V6l8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IdentityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function PolicyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z" />
      <path d="M8.5 12h7M12 8.5v7" />
    </svg>
  );
}

function AssetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.5 7.5 7.5 4 7.5-4M12 12v9" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h9M8 4l4 4-4 4" />
    </svg>
  );
}

function Dashboard() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    async function loadAuditEvents() {
      try {
        const response = await getAuditEvents();
        setEvents(response.events);
      } catch (error) {
        console.error("Failed to load audit events:", error);
      } finally {
        setAuditLoading(false);
      }
    }

    loadAuditEvents();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard">
          <section className="page-heading dashboard-heading">
            <div>
              <div className="eyebrow">CONTROL PLANE</div>

              <h1>Security overview</h1>

              <p>
                Monitor identity, access policies, assets, and security
                activity from one place.
              </p>
            </div>

            <div className="dashboard-status">
              <span className="status-pulse" />
              <span>TrustLayer operational</span>
            </div>
          </section>

          <section className="stats-grid dashboard-stats">
            <StatCard
              label="IDENTITIES"
              value="—"
              detail="Awaiting identity index"
              icon={<IdentityIcon />}
              state="neutral"
            />

            <StatCard
              label="ACTIVE POLICIES"
              value="—"
              detail="PolicyEngine pending"
              icon={<PolicyIcon />}
              state="pending"
            />

            <StatCard
              label="DIGITAL ASSETS"
              value="—"
              detail="Asset index pending"
              icon={<AssetIcon />}
              state="neutral"
            />

            <StatCard
              label="SECURITY EVENTS"
              value={auditLoading ? "…" : String(events.length)}
              detail={
                auditLoading
                  ? "Loading audit index"
                  : events.length === 0
                    ? "No indexed events"
                    : "Indexed blockchain events"
              }
              icon={<ActivityIcon />}
              state={auditLoading ? "neutral" : "ready"}
            />
          </section>

          <section className="content-grid dashboard-content">
            <div className="panel activity-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-kicker">ACTIVITY</div>
                  <h2>Recent security events</h2>
                  <p className="panel-description">
                    Latest events observed by the TrustLayer audit pipeline.
                  </p>
                </div>

                <Link className="text-button" to="/audit">
                  View audit log
                  <ArrowIcon />
                </Link>
              </div>

              {auditLoading ? (
                <div className="activity-skeleton" aria-label="Loading activity">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div className="activity-skeleton-row" key={index}>
                      <span />
                      <div>
                        <span />
                        <span />
                      </div>
                      <span />
                    </div>
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="empty-state dashboard-empty">
                  <div className="empty-icon">
                    <ActivityIcon />
                  </div>

                  <h3>No indexed activity yet</h3>

                  <p>
                    Blockchain audit events will appear here once the
                    finalized contract indexer is connected.
                  </p>

                  <Link className="secondary-action" to="/audit">
                    Open audit log
                    <ArrowIcon />
                  </Link>
                </div>
              ) : (
                <div className="activity-list">
                  {events.slice(0, 6).map((event, index) => (
                    <div
                      className="activity-row"
                      key={`${event.transaction_hash}-${event.log_index}`}
                      style={{ "--activity-index": index } as React.CSSProperties}
                    >
                      <div className="activity-marker">
                        <span />
                      </div>

                      <div className="activity-main">
                        <strong>{event.event_name}</strong>

                        <span>
                          Block {event.block_number} ·{" "}
                          {event.transaction_hash.slice(0, 10)}…
                        </span>
                      </div>

                      <span className="activity-action">
                        <span>Indexed</span>
                        <ArrowIcon />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel security-panel dashboard-security-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-kicker">SECURITY</div>

                  <h2>Protection status</h2>

                  <p className="panel-description">
                    Core TrustLayer protection layers.
                  </p>
                </div>

                <div className="security-shield">
                  <ShieldIcon />
                </div>
              </div>

              <div className="security-list">
                <div className="security-row">
                  <div>
                    <strong>Identity layer</strong>
                    <span>DID verification</span>
                  </div>

                  <StatusBadge>Ready</StatusBadge>
                </div>

                <div className="security-row">
                  <div>
                    <strong>Policy engine</strong>
                    <span>Access decisions</span>
                  </div>

                  <StatusBadge>Ready</StatusBadge>
                </div>

                <div className="security-row">
                  <div>
                    <strong>Audit pipeline</strong>
                    <span>Event indexing</span>
                  </div>

                  <StatusBadge variant="warning">Pending</StatusBadge>
                </div>

                <div className="security-row">
                  <div>
                    <strong>AI security agent</strong>
                    <span>Threat analysis</span>
                  </div>

                  <StatusBadge variant="neutral">Offline</StatusBadge>
                </div>
              </div>

              <div className="security-footer">
                <span className="security-footer-icon">
                  <ShieldIcon />
                </span>
                <span>Security controls are evaluated independently.</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
