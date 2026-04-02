import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './LabPage.css';

// ── offline-capable rule-based simulation helpers ─────────────────────────────

function isValidIP(ip) {
  if (!ip) return false;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

function isValidSubnet(mask) {
  if (!isValidIP(mask)) return false;
  const bits = mask.split('.').map(o => Number(o).toString(2).padStart(8, '0')).join('');
  return /^1*0*$/.test(bits);
}

function ipToInt(ip) {
  return ip.split('.').reduce((a, o) => (a << 8) | Number(o), 0) >>> 0;
}

function sameSubnet(ip1, m1, ip2, m2) {
  if (!isValidIP(ip1) || !isValidSubnet(m1) || !isValidIP(ip2) || !isValidSubnet(m2)) return false;
  if (m1 !== m2) return false;
  const mask = ipToInt(m1);
  return (ipToInt(ip1) & mask) === (ipToInt(ip2) & mask);
}

function localFeedback(action, topology) {
  const { type, deviceId, ip, subnet, fromId, toId } = action;
  const devices = topology.devices || [];
  const connections = topology.connections || [];

  if (type === 'assign_ip') {
    if (!isValidIP(ip)) return { ok: false, msg: `❌ "${ip}" is not a valid IPv4 address.` };
    if (!isValidSubnet(subnet)) return { ok: false, msg: `❌ "${subnet}" is not a valid subnet mask.` };
    const conflict = devices.find(d => d.id !== deviceId && d.ip === ip);
    if (conflict) return { ok: false, msg: `❌ ${ip} is already assigned to ${conflict.name}.` };
    if (ip.startsWith('127.')) return { ok: false, msg: '❌ Loopback addresses cannot be used for devices.' };
    return { ok: true, msg: `✅ IP ${ip} / ${subnet} assigned to device.` };
  }

  if (type === 'connect') {
    const d1 = devices.find(d => d.id === fromId);
    const d2 = devices.find(d => d.id === toId);
    if (!d1 || !d2) return { ok: false, msg: '❌ Device not found.' };
    if (fromId === toId) return { ok: false, msg: '❌ Cannot connect a device to itself.' };
    const already = connections.some(
      c => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
    );
    if (already) return { ok: false, msg: `❌ ${d1.name} and ${d2.name} are already connected.` };
    return { ok: true, msg: `✅ ${d1.name} ↔ ${d2.name} connected.` };
  }

  if (type === 'ping') {
    const src = devices.find(d => d.id === fromId);
    const dst = devices.find(d => d.id === toId);
    if (!src || !dst) return { ok: false, msg: '❌ Device not found.' };
    if (!src.ip) return { ok: false, msg: `❌ ${src.name} has no IP. Configure it first.` };
    if (!dst.ip) return { ok: false, msg: `❌ ${dst.name} has no IP. Configure it first.` };
    const linked = connections.some(
      c => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
    );
    if (!linked) return { ok: false, msg: `❌ ${src.name} and ${dst.name} are not connected.` };
    if (!sameSubnet(src.ip, src.subnet, dst.ip, dst.subnet)) {
      return { ok: false, msg: `❌ ${src.name} (${src.ip}) and ${dst.name} (${dst.ip}) are on different subnets.` };
    }
    return { ok: true, msg: `✅ Ping successful! ${src.ip} → ${dst.ip}: 4 packets, 0% loss.` };
  }
  return { ok: false, msg: 'Unknown action.' };
}

// ── device icons ──────────────────────────────────────────────────────────────
const DEVICE_ICONS = { pc: '💻', router: '📡', switch: '🔀' };

// ── Task checklist item ───────────────────────────────────────────────────────
function TaskItem({ task, completed }) {
  return (
    <div className={`task-item ${completed ? 'done' : ''}`}>
      <span className="task-check">{completed ? '✅' : '⬜'}</span>
      <span>{task.description}</span>
    </div>
  );
}

// ── Connection SVG lines ──────────────────────────────────────────────────────
function ConnectionLines({ connections, devices }) {
  const getPos = id => {
    const d = devices.find(d => d.id === id);
    return d ? { x: d.x + 36, y: d.y + 36 } : null;
  };
  return (
    <svg className="canvas-svg" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {connections.map((c, i) => {
        const p1 = getPos(c.from);
        const p2 = getPos(c.to);
        if (!p1 || !p2) return null;
        return (
          <line
            key={i}
            x1={p1.x} y1={p1.y}
            x2={p2.x} y2={p2.y}
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="6 3"
          />
        );
      })}
    </svg>
  );
}

// ── Main page component ───────────────────────────────────────────────────────
export default function LabPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lab, setLab] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [topology, setTopology] = useState({ devices: [], connections: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal for IP config
  const [configDevice, setConfigDevice] = useState(null);
  const [ipInput, setIpInput] = useState('');
  const [subnetInput, setSubnetInput] = useState('255.255.255.0');

  // Connect mode
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);

  // Ping mode
  const [pingMode, setPingMode] = useState(false);
  const [pingFrom, setPingFrom] = useState(null);

  // Feedback log
  const [feedbackLog, setFeedbackLog] = useState([]);
  const feedbackRef = useRef(null);

  // Task completion tracking — derived from topology + explicit ping marks
  const [pingCompleted, setPingCompleted] = useState(new Set());
  const [sessionDone, setSessionDone] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  const completedTasks = useMemo(() => {
    const done = new Set(pingCompleted);
    if (!lab?.tasks) return done;
    lab.tasks.forEach(task => {
      if (task.type === 'assign_ip') {
        const dev = topology.devices.find(d => d.id === task.device);
        if (dev && dev.ip === task.expectedIp && dev.subnet === task.expectedSubnet) {
          done.add(task.id);
        }
      } else if (task.type === 'connect') {
        const linked = topology.connections.some(
          c => (c.from === task.from && c.to === task.to) || (c.from === task.to && c.to === task.from)
        );
        if (linked) done.add(task.id);
      }
    });
    return done;
  }, [topology, lab, pingCompleted]);

  // ── Load lab + start session ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    api.get(`/labs/${id}`)
      .then(res => {
        setLab(res.data);
        const topo = res.data.topology || { devices: [], connections: [] };
        setTopology(topo);
        // Try to start a server session for persistence
        return api.post(`/labs/${id}/sessions`).catch(() => ({ data: { session_id: null } }));
      })
      .then(res => {
        setSessionId(res.data?.session_id || null);
      })
      .catch(() => setError('Failed to load lab. Running in offline mode.'))
      .finally(() => setLoading(false));
  }, [id, user, navigate]);

  // Auto-scroll feedback log
  useEffect(() => {
    if (feedbackRef.current) {
      feedbackRef.current.scrollTop = feedbackRef.current.scrollHeight;
    }
  }, [feedbackLog]);

  // ── Submit action (offline-first: local feedback, then server if available) ──
  const submitAction = useCallback(async (action) => {
    // Local feedback first (always works)
    const local = localFeedback(action, topology);
    const timestamp = new Date().toLocaleTimeString();

    if (local.ok) {
      // Apply action to local topology immediately
      setTopology(prev => {
        const next = { devices: [...prev.devices], connections: [...prev.connections] };
        if (action.type === 'assign_ip') {
          next.devices = next.devices.map(d =>
            d.id === action.deviceId ? { ...d, ip: action.ip, subnet: action.subnet } : d
          );
        } else if (action.type === 'connect') {
          next.connections = [...next.connections, { from: action.fromId, to: action.toId }];
        } else if (action.type === 'ping') {
          const pingTask = lab?.tasks?.find(t => t.type === 'ping' && t.from === action.fromId && t.to === action.toId);
            if (pingTask) {
              setPingCompleted(prev => new Set([...prev, pingTask.id]));
            }
        }
        return next;
      });
    }

    setFeedbackLog(prev => [
      ...prev,
      { time: timestamp, msg: local.msg, ok: local.ok },
    ]);

    // Also send to server if session exists (non-blocking)
    if (sessionId) {
      api.post(`/labs/sessions/${sessionId}/actions`, { action }).catch(() => {});
    }

    return local;
  }, [topology, sessionId, lab]);

  // ── Device click handler ────────────────────────────────────────────────────
  function handleDeviceClick(device) {
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(device.id);
        addSystemMsg(`Select the device to connect to ${device.name}…`);
      } else if (connectFrom !== device.id) {
        submitAction({ type: 'connect', fromId: connectFrom, toId: device.id });
        setConnectFrom(null);
        setConnectMode(false);
      }
      return;
    }
    if (pingMode) {
      if (!pingFrom) {
        setPingFrom(device.id);
        addSystemMsg(`Select the destination device to ping from ${device.name}…`);
      } else if (pingFrom !== device.id) {
        submitAction({ type: 'ping', fromId: pingFrom, toId: device.id });
        setPingFrom(null);
        setPingMode(false);
      }
      return;
    }
    // Default: open IP config modal
    setConfigDevice(device);
    setIpInput(device.ip || '');
    setSubnetInput(device.subnet || '255.255.255.0');
  }

  function addSystemMsg(msg) {
    const timestamp = new Date().toLocaleTimeString();
    setFeedbackLog(prev => [...prev, { time: timestamp, msg, ok: null }]);
  }

  // ── IP config modal submit ─────────────────────────────────────────────────
  async function handleIPSubmit(e) {
    e.preventDefault();
    if (!configDevice) return;
    await submitAction({
      type: 'assign_ip',
      deviceId: configDevice.id,
      ip: ipInput.trim(),
      subnet: subnetInput.trim(),
    });
    setConfigDevice(null);
  }

  // ── Complete session ────────────────────────────────────────────────────────
  async function handleComplete() {
    if (sessionId) {
      try {
        const res = await api.post(`/labs/sessions/${sessionId}/complete`);
        setFinalScore(res.data.score);
      } catch {
        const score = lab?.tasks?.length
          ? Math.round((completedTasks.size / lab.tasks.length) * 100)
          : 0;
        setFinalScore(score);
      }
    } else {
      const score = lab?.tasks?.length
        ? Math.round((completedTasks.size / lab.tasks.length) * 100)
        : 0;
      setFinalScore(score);
    }
    setSessionDone(true);
  }

  // ── Cancel connect/ping modes ──────────────────────────────────────────────
  function cancelModes() {
    setConnectMode(false);
    setConnectFrom(null);
    setPingMode(false);
    setPingFrom(null);
  }

  if (loading) return <div className="lab-loading">Loading lab…</div>;
  if (!lab) return <div className="lab-error">Lab not found. <button onClick={() => navigate('/labs')}>Back</button></div>;

  const tasks = lab.tasks || [];
  const allDone = tasks.length > 0 && completedTasks.size >= tasks.length;

  return (
    <div className="lab-page">
      {/* Header */}
      <div className="lab-header">
        <div>
          <h1>{lab.title}</h1>
          {lab.description && <p className="lab-subtitle">{lab.description}</p>}
        </div>
        <button className="btn-outline-sm" onClick={() => navigate('/labs')}>← Labs</button>
      </div>

      {error && <div className="alert alert-warn">{error}</div>}

      <div className="lab-layout">
        {/* Left: tasks + tools */}
        <aside className="lab-sidebar">
          <section className="sidebar-section">
            <h3>📋 Tasks</h3>
            {tasks.length === 0 && <p className="sidebar-hint">No tasks defined for this lab.</p>}
            {tasks.map(t => (
              <TaskItem key={t.id} task={t} completed={completedTasks.has(t.id)} />
            ))}
            {tasks.length > 0 && (
              <div className="task-progress">
                <div
                  className="task-progress-bar"
                  style={{ width: `${(completedTasks.size / tasks.length) * 100}%` }}
                />
                <span>{completedTasks.size}/{tasks.length} completed</span>
              </div>
            )}
          </section>

          <section className="sidebar-section">
            <h3>🔧 Tools</h3>
            <div className="tool-buttons">
              <button
                className={`tool-btn ${connectMode ? 'active' : ''}`}
                onClick={() => { cancelModes(); if (!connectMode) setConnectMode(true); }}
                title="Connect two devices with a cable"
              >
                🔗 Connect
              </button>
              <button
                className={`tool-btn ${pingMode ? 'active' : ''}`}
                onClick={() => { cancelModes(); if (!pingMode) setPingMode(true); }}
                title="Test connectivity between devices"
              >
                📡 Ping
              </button>
              {(connectMode || pingMode) && (
                <button className="tool-btn cancel" onClick={cancelModes}>✕ Cancel</button>
              )}
            </div>
            {connectMode && (
              <p className="tool-hint">
                {connectFrom
                  ? 'Click the second device to complete the connection.'
                  : 'Click the first device to start connecting.'}
              </p>
            )}
            {pingMode && (
              <p className="tool-hint">
                {pingFrom
                  ? 'Click the destination device.'
                  : 'Click the source device.'}
              </p>
            )}
          </section>

          {(allDone || sessionDone) && !sessionDone && (
            <button className="btn-complete" onClick={handleComplete}>
              ✅ Submit &amp; Complete
            </button>
          )}
          {!allDone && !sessionDone && tasks.length > 0 && (
            <button className="btn-complete secondary" onClick={handleComplete}>
              Submit Current Progress
            </button>
          )}
        </aside>

        {/* Center: canvas */}
        <main className="lab-canvas-wrapper">
          {(connectMode || pingMode) && (
            <div className="mode-banner">
              {connectMode
                ? `🔗 Connect mode — ${connectFrom ? 'select destination' : 'select source device'}`
                : `📡 Ping mode — ${pingFrom ? 'select destination' : 'select source device'}`}
            </div>
          )}
          <div className="lab-canvas" id="lab-canvas">
            <ConnectionLines connections={topology.connections} devices={topology.devices} />
            {topology.devices.map(device => (
              <div
                key={device.id}
                className={`device-node ${(connectFrom === device.id || pingFrom === device.id) ? 'selected' : ''} ${connectMode || pingMode ? 'pointer' : ''}`}
                style={{ left: device.x, top: device.y }}
                onClick={() => handleDeviceClick(device)}
                title={device.ip ? `${device.name}\n${device.ip} / ${device.subnet}` : `Click to configure ${device.name}`}
              >
                <div className="device-icon">{DEVICE_ICONS[device.type] || '📦'}</div>
                <div className="device-name">{device.name}</div>
                {device.ip ? (
                  <div className="device-ip">{device.ip}</div>
                ) : (
                  <div className="device-ip unset">No IP</div>
                )}
              </div>
            ))}
            {topology.devices.length === 0 && (
              <div className="canvas-empty">No devices in this lab topology.</div>
            )}
          </div>
        </main>

        {/* Right: feedback console */}
        <aside className="lab-feedback" ref={feedbackRef}>
          <h3>💬 Feedback Console</h3>
          {feedbackLog.length === 0 && (
            <p className="feedback-hint">
              Click a device to configure it, then use the tools on the left.
            </p>
          )}
          {feedbackLog.map((entry, i) => (
            <div key={i} className={`feedback-entry ${entry.ok === true ? 'ok' : entry.ok === false ? 'err' : 'info'}`}>
              <span className="feedback-time">{entry.time}</span>
              <span className="feedback-msg">{entry.msg}</span>
            </div>
          ))}
        </aside>
      </div>

      {/* IP Configuration Modal */}
      {configDevice && (
        <div className="modal-overlay" onClick={() => setConfigDevice(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Configure {configDevice.name}</h2>
            <form onSubmit={handleIPSubmit} className="config-form">
              <label>
                IP Address
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.1"
                  value={ipInput}
                  onChange={e => setIpInput(e.target.value)}
                  autoFocus
                />
              </label>
              <label>
                Subnet Mask
                <input
                  type="text"
                  placeholder="e.g. 255.255.255.0"
                  value={subnetInput}
                  onChange={e => setSubnetInput(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Apply</button>
                <button type="button" className="btn-outline" onClick={() => setConfigDevice(null)}>
                  Cancel
                </button>
              </div>
            </form>
            {configDevice.ip && (
              <p className="current-config">
                Current: {configDevice.ip} / {configDevice.subnet}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {sessionDone && (
        <div className="modal-overlay">
          <div className="modal completion-modal">
            <div className="score-ring">{finalScore}%</div>
            <h2>Lab {finalScore >= 70 ? 'Completed! 🎉' : 'Submitted'}</h2>
            <p className="score-detail">
              You completed <strong>{completedTasks.size}</strong> of{' '}
              <strong>{tasks.length}</strong> tasks.
            </p>
            <p className="score-msg">
              {finalScore >= 90
                ? '🌟 Excellent work! You have mastered this lab.'
                : finalScore >= 70
                ? '👍 Good job! Review any missed tasks for full marks.'
                : '📘 Keep practising — review the feedback and try again.'}
            </p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => navigate('/labs')}>
                Back to Labs
              </button>
              {user && (
                <button className="btn-outline" onClick={() => navigate(`/labs/progress/${user.id}`)}>
                  View My Progress
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
