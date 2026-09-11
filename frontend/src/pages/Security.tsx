import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";
import {
  getSecurityCenter,
  getSecurityFindings,
  getRiskGraph,
} from "../services/security";
import type {
  SecurityEvent,
  SecurityFinding,
  SecuritySummary,
  RiskGraphResponse,
} from "../types/api";

function severityClass(severity: string): string {
  return `security-severity security-severity-${severity.toLowerCase()}`;
}

function Security() {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [riskGraph, setRiskGraph] = useState<RiskGraphResponse | null>(null);

  useEffect(() => {
    async function loadSecurity() {
      try {
        setError("");

        const [securityResponse, findingsResponse, riskGraphResponse] = await Promise.all([
          getSecurityCenter(),
          getSecurityFindings(),
          getRiskGraph(),
        ]);

        setSummary(securityResponse.summary);
        setEvents(securityResponse.events);
        setFindings(findingsResponse.findings);
        setRiskGraph(riskGraphResponse);
      } catch (error) {
        console.error("Failed to load security center:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load the security center.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSecurity();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <main className="dashboard">
          <section className="page-heading">
            <div>
              <div className="eyebrow">SECURITY OPERATIONS</div>
              <h1>Security Center</h1>
              <p>
                Monitor access decisions, policy violations, identity
                anomalies, and AI-detected security threats across TrustLayer.
              </p>
            </div>

            <StatusBadge>Security layer ready</StatusBadge>
          </section>

          {error && (
            <div className="security-load-error" role="alert">
              <Icon name="shield" />
              <div>
                <strong>Security data unavailable</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <section className="security-overview">
            <div className="security-score-card">
              <div className="security-card-label">
                SECURITY POSTURE
              </div>

              <div className="security-score">
                {loading ? "…" : summary?.security_score}
                {!loading && <span>/100</span>}
              </div>

              <div className="security-score-bar">
                <div
                  className="security-score-fill"
                  style={{
                    width: `${summary?.security_score ?? 0}%`,
                  }}
                />
              </div>

              <div className="security-score-detail">
                Overall platform security posture
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">ACTIVE ALERTS</span>
                <span className="stat-icon"><Icon name="shield" /></span>
              </div>

              <div className="stat-value">
                {loading ? "…" : summary?.active_alerts}
              </div>

              <div className="stat-detail">
                High or critical events
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">BLOCKED REQUESTS</span>
                <span className="stat-icon"><Icon name="resource" /></span>
              </div>

              <div className="stat-value">
                {loading ? "…" : summary?.blocked_requests}
              </div>

              <div className="stat-detail">
                Requests denied by policy
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">EVENTS REVIEWED</span>
                <span className="stat-icon"><Icon name="check" /></span>
              </div>

              <div className="stat-value">
                {loading ? "…" : summary?.events_reviewed}
              </div>

              <div className="stat-detail">
                Security events reviewed
              </div>
            </div>
          </section>

          <section className="panel security-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">TRUST INTELLIGENCE</div>
                <h2>Trust / Risk Graph</h2>
              </div>

              <StatusBadge>
                {riskGraph
                  ? `${riskGraph.count.nodes} nodes · ${riskGraph.count.links} links`
                  : "Loading"}
              </StatusBadge>
            </div>

            {loading ? (
              <div className="resource-empty">
                <div className="security-state-icon"><Icon name="resource" /></div>
                <h3>Building trust relationships</h3>
                <p>Correlating identities, resources, assets, events, and threats.</p>
              </div>
            ) : !riskGraph || riskGraph.nodes.length === 0 ? (
              <div className="resource-empty">
                <div className="security-state-icon"><Icon name="resource" /></div>
                <h3>No relationship evidence yet</h3>
                <p>The graph will populate as TrustMesh records security telemetry.</p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 220px",
                  gap: "20px",
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    minHeight: "320px",
                    overflow: "auto",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    {riskGraph.nodes.slice(0, 24).map((node) => (
                      <div
                        key={node.id}
                        title={`Risk ${node.risk}/100`}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "12px",
                          border: `1px solid ${
                            node.risk >= 80
                              ? "rgba(255,90,90,0.55)"
                              : "rgba(255,255,255,0.12)"
                          }`,
                          background:
                            node.risk >= 80
                              ? "rgba(255,70,70,0.10)"
                              : "rgba(255,255,255,0.035)",
                          minWidth: "120px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            opacity: 0.55,
                          }}
                        >
                          {node.type}
                        </div>
                        <div
                          style={{
                            marginTop: "5px",
                            fontWeight: 650,
                            wordBreak: "break-word",
                          }}
                        >
                          {node.label}
                        </div>
                        {node.risk > 0 && (
                          <div style={{ marginTop: "5px", fontSize: "11px" }}>
                            Risk {node.risk}/100
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="stat-card" style={{ height: "100%" }}>
                    <div className="stat-label">RELATIONSHIPS</div>

                    <div className="stat-value">
                      {riskGraph.count.links}
                    </div>

                    <div className="stat-detail">
                      Evidence-backed links between identities, access,
                      resources, assets, contracts, events and threats.
                    </div>

                    <div
                      style={{
                        marginTop: "18px",
                        display: "grid",
                        gap: "8px",
                        fontSize: "12px",
                      }}
                    >
                      {[
                        ["Identity", "identity"],
                        ["Role", "role"],
                        ["Permission", "permission"],
                        ["Resource", "resource"],
                        ["Asset", "asset"],
                        ["Event", "event"],
                        ["Threat", "threat"],
                      ].map(([label, type]) => (
                        <div
                          key={type}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            opacity: 0.8,
                          }}
                        >
                          <span>{label}</span>
                          <strong>
                            {riskGraph.nodes.filter((n) => n.type === type).length}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="panel security-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">AI SECURITY ANALYSIS</div>
                <h2>Security findings</h2>
              </div>

              <StatusBadge>
                {loading ? "Loading" : `${findings.length} findings`}
              </StatusBadge>
            </div>

            {loading ? (
              <div className="resource-empty">
                <div className="security-state-icon"><Icon name="shield" /></div>
                <h3>Analyzing security telemetry</h3>
                <p>
                  Reading Security Agent findings.
                </p>
              </div>
            ) : findings.length === 0 ? (
              <div className="resource-empty">
                <div className="security-state-icon"><Icon name="check" /></div>
                <h3>No security findings</h3>
                <p>
                  The Security Agent has not detected any analyzed threats yet.
                </p>
              </div>
            ) : (
              <div className="security-event-list">
                {findings.map((finding) => (
                  <div
                    className="security-event"
                    key={finding.event_id}
                  >
                    <div className="security-event-indicator">
                      <span className={severityClass(finding.severity)}>
                        {finding.severity}
                      </span>
                    </div>

                    <div className="security-event-main">
                      <div className="security-event-title">
                        <strong>{finding.event_name}</strong>
                        <span>{finding.event_id}</span>
                      </div>

                      <p>{finding.reason}</p>

                      <div className="security-event-meta">
                        <span>
                          Risk score: <strong>{finding.risk_score}/100</strong>
                        </span>

                        <span>
                          Threat detected:{" "}
                          <strong>
                            {finding.threat_detected ? "Yes" : "No"}
                          </strong>
                        </span>
                      </div>

                      <div className="security-event-meta">
                        <span>
                          Recommendation:{" "}
                          <strong>{finding.recommendation}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="security-event-status">
                      <span>
                        {finding.threat_detected ? "Threat detected" : "Reviewed"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>



          <section className="panel security-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">SECURITY ACTIVITY</div>
                <h2>Recent security events</h2>
              </div>

              <StatusBadge>
                {loading ? "Loading" : `${events.length} events`}
              </StatusBadge>
            </div>

            {loading ? (
              <div className="resource-empty">
                <div className="security-state-icon"><Icon name="shield" /></div>
                <h3>Loading security events</h3>
                <p>
                  Reading the TrustLayer security telemetry.
                </p>
              </div>
            ) : (
              <div className="security-event-list">
                {events.map((event) => (
                  <div
                    className="security-event"
                    key={event.event_id}
                  >
                    <div className="security-event-indicator">
                      <span className={severityClass(event.severity)}>
                        {event.severity}
                      </span>
                    </div>

                    <div className="security-event-main">
                      <div className="security-event-title">
                        <strong>{event.event_type}</strong>
                        <span>{event.event_id}</span>
                      </div>

                      <p>{event.description}</p>

                      <div className="security-event-meta">
                        <span>
                          Subject: <strong>{event.subject}</strong>
                        </span>

                        <span>
                          Resource: <strong>{event.resource}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="security-event-status">
                      <span>{event.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Security;