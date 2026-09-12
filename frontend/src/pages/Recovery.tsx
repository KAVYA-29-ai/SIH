import { useCallback, useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import StatusBadge from "../components/ui/StatusBadge";
import Icon from "../components/ui/Icon";
import {
  approveRecoveryRequest,
  createRecoveryRequest,
  executeRecoveryRequest,
  getRecoveryCenter,
} from "../services/recovery";
import type { RecoveryRequest, RecoverySummary } from "../types/api";

function Recovery() {
  const [summary, setSummary] = useState<RecoverySummary>({
    active_requests: 0,
    pending_consensus: 0,
    required_approvals: 0,
    timelock_hours: 0,
  });
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [requiredApprovals, setRequiredApprovals] = useState(2);
  const [timelockHours, setTimelockHours] = useState(48);
  const [formError, setFormError] = useState("");

  const loadRecovery = useCallback(async () => {
    try {
      setError("");
      const response = await getRecoveryCenter();
      setSummary(response.summary);
      setRequests(Array.isArray(response.requests) ? response.requests : []);
    } catch (requestError) {
      console.error("Failed to load recovery center:", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the recovery center.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecovery();
  }, [loadRecovery]);

  async function handleApprove(request: RecoveryRequest) {
    setActionId(request.request_id);
    setError("");

    try {
      await approveRecoveryRequest(request.request_id);
      await loadRecovery();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to approve recovery request.",
      );
    } finally {
      setActionId("");
    }
  }

  async function handleExecute(request: RecoveryRequest) {
    if (!window.confirm(`Execute recovery for ${request.subject}?`)) return;

    setActionId(request.request_id);
    setError("");

    try {
      await executeRecoveryRequest(request.request_id);
      await loadRecovery();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to execute recovery request.",
      );
    } finally {
      setActionId("");
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim() || !reason.trim()) {
      setFormError("Subject and recovery reason are required.");
      return;
    }

    setActionId("create");
    setFormError("");

    try {
      await createRecoveryRequest({
        subject: subject.trim(),
        reason: reason.trim(),
        required_approvals: requiredApprovals,
        timelock_hours: timelockHours,
      });
      setShowCreate(false);
      setSubject("");
      setReason("");
      setRequiredApprovals(2);
      setTimelockHours(48);
      await loadRecovery();
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create recovery request.",
      );
    } finally {
      setActionId("");
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="dashboard">
          <section className="page-heading">
            <div>
              <div className="eyebrow">SENTINEL PROTOCOL</div>
              <h1>Identity Recovery</h1>
              <p>Coordinate identity recovery through guardian consensus and a protected timelock.</p>
            </div>
            <div className="page-heading-actions">
              <button type="button" className="primary-action" onClick={() => { setFormError(""); setShowCreate(true); }}>
                + Recovery request
              </button>
              <StatusBadge>Sentinel layer ready</StatusBadge>
            </div>
          </section>

          {error && <div className="security-load-error" role="alert"><Icon name="shield" /><span>{error}</span></div>}

          <section className="security-overview">
            <div className="stat-card"><div className="stat-card-top"><span className="stat-label">ACTIVE REQUESTS</span><span className="stat-icon"><Icon name="resource" /></span></div><div className="stat-value">{loading ? "…" : summary.active_requests}</div><div className="stat-detail">Recovery requests in progress</div></div>
            <div className="stat-card"><div className="stat-card-top"><span className="stat-label">CONSENSUS</span><span className="stat-icon"><Icon name="identity" /></span></div><div className="stat-value">{loading ? "…" : summary.pending_consensus}</div><div className="stat-detail">Requests awaiting approval</div></div>
            <div className="stat-card"><div className="stat-card-top"><span className="stat-label">APPROVALS REQUIRED</span><span className="stat-icon"><Icon name="check" /></span></div><div className="stat-value">{loading ? "…" : summary.required_approvals}</div><div className="stat-detail">Guardian approvals required</div></div>
            <div className="stat-card"><div className="stat-card-top"><span className="stat-label">TIMELOCK</span><span className="stat-icon"><Icon name="resource" /></span></div><div className="stat-value">{loading ? "…" : `${summary.timelock_hours}h`}</div><div className="stat-detail">Protected recovery delay</div></div>
          </section>

          <section className="panel recovery-panel">
            <div className="panel-header">
              <div><div className="panel-kicker">RECOVERY QUEUE</div><h2>Identity recovery requests</h2></div>
              <StatusBadge>{loading ? "Loading" : "Consensus protected"}</StatusBadge>
            </div>

            {loading ? (
              <div className="resource-empty recovery-state"><div className="security-state-icon"><Icon name="identity" /></div><h3>Loading recovery requests</h3><p>Reading Sentinel recovery state.</p></div>
            ) : requests.length === 0 ? (
              <div className="resource-empty recovery-state"><div className="security-state-icon"><Icon name="check" /></div><h3>No active recovery requests</h3><p>Create a recovery request when an identity requires restoration.</p></div>
            ) : (
              <div className="recovery-list">
                {requests.map((request) => {
                  const progress = request.required_approvals > 0 ? Math.min((request.approvals / request.required_approvals) * 100, 100) : 0;
                  const busy = actionId === request.request_id;
                  const ready = request.approvals >= request.required_approvals;
                  const recovered = request.status === "Recovered" || request.status.toLowerCase().startsWith("recovered");

                  return (
                    <div className="recovery-request" key={request.request_id}>
                      <div className="recovery-request-icon"><Icon name="identity" /></div>
                      <div className="recovery-request-main">
                        <div className="recovery-request-title"><strong>{request.reason}</strong><span>{request.request_id}</span></div>
                        <div className="recovery-request-subject">Subject: <strong>{request.subject}</strong></div>
                        <div className="recovery-progress">
                          <div className="recovery-progress-header"><span>Guardian consensus</span><strong>{request.approvals}/{request.required_approvals}</strong></div>
                          <div className="recovery-progress-track"><div className="recovery-progress-fill" style={{ width: `${progress}%` }} /></div>
                        </div>
                      </div>
                      <div className="recovery-request-meta">
                        <span className="recovery-status">{request.status}</span>
                        <span>Timelock: {request.timelock_hours}h</span>
                        <div className="recovery-action-row">
                          {!recovered && request.status === "Pending Consensus" && (
                            <button type="button" className="secondary-action" disabled={busy} onClick={() => void handleApprove(request)}>
                              {busy ? "Approving…" : "Approve"}
                            </button>
                          )}
                          {!recovered && ready && (
                            <button type="button" className="primary-action" disabled={busy} onClick={() => void handleExecute(request)}>
                              {busy ? "Executing…" : "Execute recovery"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {showCreate && (
        <div className="asset-modal-backdrop" role="presentation">
          <section className="asset-modal" role="dialog" aria-modal="true" aria-labelledby="recovery-request-title">
            <div className="asset-modal-header">
              <div><span className="eyebrow">Sentinel recovery</span><h2 id="recovery-request-title">Create recovery request</h2><p>Start a governed recovery workflow for a restricted identity.</p></div>
              <button type="button" className="asset-modal-close" aria-label="Close" onClick={() => setShowCreate(false)} disabled={actionId === "create"}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="asset-form-grid">
                <label>Subject DID<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="did:trust:..." required /></label>
                <label>Guardian approvals<input type="number" min={1} value={requiredApprovals} onChange={(event) => setRequiredApprovals(Number(event.target.value) || 1)} /></label>
                <label>Timelock (hours)<input type="number" min={0} value={timelockHours} onChange={(event) => setTimelockHours(Math.max(0, Number(event.target.value) || 0))} /></label>
                <label className="asset-form-full">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why the identity should be restored." rows={4} required /></label>
              </div>
              {formError && <div className="asset-form-error" role="alert">{formError}</div>}
              <div className="asset-modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowCreate(false)} disabled={actionId === "create"}>Cancel</button>
                <button type="submit" className="primary-action" disabled={actionId === "create"}>{actionId === "create" ? "Creating…" : "Create request"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Recovery;
