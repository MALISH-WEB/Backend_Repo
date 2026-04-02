import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './TeacherLabPage.css';

const DEVICE_TYPES = ['pc', 'router', 'switch'];
const SCENARIO_TYPES = [
  { value: 'ip_config', label: 'IP Configuration' },
  { value: 'subnetting', label: 'Subnetting' },
  { value: 'connectivity', label: 'Connectivity Testing' },
];
const TASK_TYPES = [
  { value: 'assign_ip', label: 'Assign IP Address' },
  { value: 'connect', label: 'Connect Devices' },
  { value: 'ping', label: 'Ping Test' },
];

let deviceCounter = 1;
let taskCounter = 1;

function newDevice() {
  const id = `device${deviceCounter++}`;
  return { id, type: 'pc', name: `Device ${deviceCounter - 1}`, x: 80 + Math.random() * 300, y: 80 + Math.random() * 180 };
}

function newTask() {
  return {
    id: `task${taskCounter++}`,
    description: '',
    type: 'assign_ip',
    device: '',
    from: '',
    to: '',
    expectedIp: '',
    expectedSubnet: '255.255.255.0',
    competency: 'ip_configuration',
  };
}

export default function TeacherLabPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scenarioType, setScenarioType] = useState('ip_config');
  const [devices, setDevices] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) {
    navigate('/login');
    return null;
  }

  function addDevice() {
    setDevices(prev => [...prev, newDevice()]);
  }

  function removeDevice(id) {
    setDevices(prev => prev.filter(d => d.id !== id));
    // Remove tasks referencing this device
    setTasks(prev => prev.filter(
      t => t.device !== id && t.from !== id && t.to !== id
    ));
  }

  function updateDevice(id, field, value) {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }

  function addTask() {
    setTasks(prev => [...prev, newTask()]);
  }

  function removeTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function updateTask(id, field, value) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Lab title is required.'); return; }
    if (devices.length === 0) { setError('Add at least one device.'); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    const topology = { devices, connections: [] };
    const cleanedTasks = tasks.map(({ id, description, type, device, from, to, expectedIp, expectedSubnet, competency }) => ({
      id, description, type,
      ...(type === 'assign_ip' ? { device, expectedIp, expectedSubnet } : {}),
      ...(type === 'connect' || type === 'ping' ? { from, to } : {}),
      competency,
    }));

    try {
      const res = await api.post('/labs', {
        title: title.trim(),
        description: description.trim(),
        scenario_type: scenarioType,
        topology,
        tasks: cleanedTasks,
      });
      setSuccess(`Lab created! ID: ${res.data.id}`);
      setTimeout(() => navigate('/labs'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lab.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="teacher-lab-page">
      <div className="teacher-hero">
        <h1>🏫 Create a Networking Lab</h1>
        <p>Design a lab exercise for your students. Add devices and tasks below.</p>
      </div>

      <div className="teacher-container">
        <form onSubmit={handleSubmit} className="teacher-form">

          {/* Basic info */}
          <section className="form-section">
            <h2>Lab Details</h2>
            <label>
              Title *
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Basic IP Configuration" />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what students will learn…"
                rows={3}
              />
            </label>
            <label>
              Scenario Type
              <select value={scenarioType} onChange={e => setScenarioType(e.target.value)}>
                {SCENARIO_TYPES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
          </section>

          {/* Devices */}
          <section className="form-section">
            <div className="section-header">
              <h2>Network Devices</h2>
              <button type="button" className="btn-add" onClick={addDevice}>+ Add Device</button>
            </div>
            {devices.length === 0 && (
              <p className="empty-hint">No devices yet — click "Add Device" to start.</p>
            )}
            <div className="device-list">
              {devices.map(d => (
                <div key={d.id} className="device-row">
                  <input
                    placeholder="Name"
                    value={d.name}
                    onChange={e => updateDevice(d.id, 'name', e.target.value)}
                  />
                  <select value={d.type} onChange={e => updateDevice(d.id, 'type', e.target.value)}>
                    {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="device-id-badge">{d.id}</span>
                  <button type="button" className="btn-remove" onClick={() => removeDevice(d.id)}>✕</button>
                </div>
              ))}
            </div>
          </section>

          {/* Tasks */}
          <section className="form-section">
            <div className="section-header">
              <h2>Tasks / Competencies</h2>
              <button type="button" className="btn-add" onClick={addTask}>+ Add Task</button>
            </div>
            {tasks.length === 0 && (
              <p className="empty-hint">No tasks yet — click "Add Task".</p>
            )}
            <div className="task-list">
              {tasks.map((t, idx) => (
                <div key={t.id} className="task-row">
                  <div className="task-row-header">
                    <strong>Task {idx + 1}</strong>
                    <button type="button" className="btn-remove" onClick={() => removeTask(t.id)}>✕</button>
                  </div>

                  <label>
                    Description
                    <input
                      value={t.description}
                      onChange={e => updateTask(t.id, 'description', e.target.value)}
                      placeholder="What should the student do?"
                    />
                  </label>

                  <div className="task-row-fields">
                    <label>
                      Task Type
                      <select value={t.type} onChange={e => updateTask(t.id, 'type', e.target.value)}>
                        {TASK_TYPES.map(tt => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                      </select>
                    </label>
                    <label>
                      Competency Tag
                      <input
                        value={t.competency}
                        onChange={e => updateTask(t.id, 'competency', e.target.value)}
                        placeholder="e.g. ip_configuration"
                      />
                    </label>
                  </div>

                  {t.type === 'assign_ip' && (
                    <div className="task-row-fields">
                      <label>
                        Target Device ID
                        <select value={t.device} onChange={e => updateTask(t.id, 'device', e.target.value)}>
                          <option value="">-- select --</option>
                          {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
                        </select>
                      </label>
                      <label>
                        Expected IP
                        <input
                          value={t.expectedIp}
                          onChange={e => updateTask(t.id, 'expectedIp', e.target.value)}
                          placeholder="192.168.1.1"
                        />
                      </label>
                      <label>
                        Expected Subnet
                        <input
                          value={t.expectedSubnet}
                          onChange={e => updateTask(t.id, 'expectedSubnet', e.target.value)}
                          placeholder="255.255.255.0"
                        />
                      </label>
                    </div>
                  )}

                  {(t.type === 'connect' || t.type === 'ping') && (
                    <div className="task-row-fields">
                      <label>
                        From Device
                        <select value={t.from} onChange={e => updateTask(t.id, 'from', e.target.value)}>
                          <option value="">-- select --</option>
                          {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
                        </select>
                      </label>
                      <label>
                        To Device
                        <select value={t.to} onChange={e => updateTask(t.id, 'to', e.target.value)}>
                          <option value="">-- select --</option>
                          {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '💾 Create Lab'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/labs')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
