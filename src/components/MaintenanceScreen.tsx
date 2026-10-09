import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, ClipboardCheck, Flame, History, Plus } from 'lucide-react';
import { PLANT_SHIFTS, PlantStateData } from '../types.ts';

interface MaintenanceScreenProps {
  data: PlantStateData;
  onLogBreakdown: (payload: any) => Promise<void>;
  onUpdateBreakdownStatus: (id: number, status: string, actionTaken: string) => Promise<void>;
  onLogDailyMaintenance: (payload: any) => Promise<void>;
  onCreatePreventiveSchedule: (payload: any) => Promise<void>;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  data,
  onLogBreakdown,
  onUpdateBreakdownStatus,
  onLogDailyMaintenance,
  onCreatePreventiveSchedule,
}) => {
  const [subTab, setSubTab] = useState<'breakdowns' | 'daily' | 'preventive' | 'history'>(
    'breakdowns'
  );
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [bdForm, setBdForm] = useState({
    ticketCode: `BD-${new Date().getFullYear()}-${String(data.breakdownLogs.length + 1).padStart(3, '0')}`,
    machineId: data.machines[0]?.id || 0,
    sectionId: data.sections[0]?.id || 0,
    severity: 'Critical',
    failureMode: '',
    rootCause: '',
    assignedTechnician: '',
    downtimeMinutes: 0,
  });

  const [dmForm, setDmForm] = useState({
    machineId: data.machines[0]?.id || 0,
    checklistTitle: '',
    shift: PLANT_SHIFTS[0],
    operatorName: '',
    lubricationOk: true,
    pressureBar: '',
    temperatureCelsius: '',
    vibrationMmS: '',
    remarks: '',
    status: 'Completed',
  });

  const [pmForm, setPmForm] = useState({
    scheduleCode: `PM-${new Date().getFullYear()}-${String(data.preventiveSchedules.length + 1).padStart(3, '0')}`,
    machineId: data.machines[0]?.id || 0,
    title: '',
    frequency: 'Monthly',
    assignedEngineer: '',
    nextDueDate: new Date().toISOString().slice(0, 10),
    estimatedHours: 4,
  });

  const getMachineLabel = (id: number) => {
    const m = data.machines.find((x) => x.id === id);
    return m ? `${m.code} — ${m.name}` : `Machine #${id}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (subTab === 'breakdowns') {
        await onLogBreakdown({
          ...bdForm,
          machineId: Number(bdForm.machineId),
          sectionId: Number(bdForm.sectionId),
          downtimeMinutes: Number(bdForm.downtimeMinutes),
        });
      } else if (subTab === 'daily') {
        await onLogDailyMaintenance({
          ...dmForm,
          machineId: Number(dmForm.machineId),
        });
      } else if (subTab === 'preventive') {
        await onCreatePreventiveSchedule({
          ...pmForm,
          machineId: Number(pmForm.machineId),
          estimatedHours: Number(pmForm.estimatedHours),
        });
      }
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar & Action CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cmms-card rounded-md p-3">
        <div className="overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex items-center gap-2 min-w-0">
          {[
            {
              id: 'breakdowns',
              label: 'Breakdown Logs',
              count: data.breakdownLogs.length,
              icon: Flame,
            },
            {
              id: 'daily',
              label: 'Daily Maintenance',
              count: data.dailyMaintenance.length,
              icon: ClipboardCheck,
            },
            {
              id: 'preventive',
              label: 'Preventive Schedules',
              count: data.preventiveSchedules.length,
              icon: CalendarClock,
            },
            {
              id: 'history',
              label: 'Machine History',
              count: data.machineHistory.length,
              icon: History,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold whitespace-nowrap shrink-0 transition-all border min-h-[36px] ${
                  active
                    ? 'bg-[var(--accent-color)]/15 text-[var(--accent-text)] border-[var(--accent-color)] shadow-xs'
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)]'}`} />
                <span>{tab.label}</span>
                <span className="font-mono-tech text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {subTab !== 'history' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--accent-color)] hover:opacity-90 text-white text-xs font-semibold shadow-xs transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>
              {subTab === 'breakdowns'
                ? 'Log Breakdown'
                : subTab === 'daily'
                ? 'Record Daily Check'
                : 'Schedule PM Task'}
            </span>
          </button>
        )}
      </div>

      {/* Content Tables */}
      <div className="cmms-card rounded-md overflow-hidden">
        {subTab === 'breakdowns' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Failure Mode & Root Cause</th>
                  <th className="py-3 px-4">Downtime</th>
                  <th className="py-3 px-4">Assigned Tech</th>
                  <th className="py-3 px-4">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.breakdownLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No breakdown records logged. Machinery fleet is operating normally.
                    </td>
                  </tr>
                ) : (
                  data.breakdownLogs.map((bd) => (
                    <tr key={bd.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                        {bd.ticketCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        {getMachineLabel(bd.machineId)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded ${
                            bd.severity === 'Critical'
                              ? 'cmms-badge-critical'
                              : bd.severity === 'Major'
                              ? 'cmms-badge-warning'
                              : 'cmms-badge-info'
                          }`}
                        >
                          {bd.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="text-[var(--text-primary)] font-medium">{bd.failureMode}</div>
                        {bd.rootCause && (
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            Cause: {bd.rootCause}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--text-primary)]">
                        {bd.downtimeMinutes} min
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{bd.assignedTechnician}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded ${
                              bd.status === 'Resolved'
                                ? 'cmms-badge-success'
                                : 'cmms-badge-critical'
                            }`}
                          >
                            {bd.status}
                          </span>
                          {bd.status !== 'Resolved' && (
                            <button
                              onClick={() =>
                                onUpdateBreakdownStatus(
                                  bd.id,
                                  'Resolved',
                                  'Replaced faulty assembly, tested under full load, restored to production.'
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--accent-color)] hover:opacity-90 text-white text-[11px] font-semibold transition-opacity"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'daily' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Checklist Title</th>
                  <th className="py-3 px-4">Shift / Operator</th>
                  <th className="py-3 px-4">Pressure / Temp / Vib</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.dailyMaintenance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No daily inspection checks recorded for this duty cycle.
                    </td>
                  </tr>
                ) : (
                  data.dailyMaintenance.map((dm) => (
                    <tr key={dm.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        {getMachineLabel(dm.machineId)}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">{dm.checklistTitle}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        <span className="font-mono-tech text-[var(--text-primary)]">{dm.shift}</span> • {dm.operatorName}
                      </td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--accent-text)]">
                        {dm.pressureBar || '—'} | {dm.temperatureCelsius || '—'} | {dm.vibrationMmS || '—'}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{dm.remarks || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded ${
                            dm.status === 'Completed'
                              ? 'cmms-badge-success'
                              : 'cmms-badge-warning'
                          }`}
                        >
                          {dm.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'preventive' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Schedule Code</th>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">PM Task Title</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Next Due</th>
                  <th className="py-3 px-4">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.preventiveSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No preventive maintenance schedules scheduled.
                    </td>
                  </tr>
                ) : (
                  data.preventiveSchedules.map((pm) => (
                    <tr key={pm.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                        {pm.scheduleCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        {getMachineLabel(pm.machineId)}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">{pm.title}</td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">{pm.frequency}</td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--text-primary)]">{pm.nextDueDate}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded ${
                            pm.complianceStatus === 'Overdue'
                              ? 'cmms-badge-critical'
                              : pm.complianceStatus === 'Due Soon'
                              ? 'cmms-badge-warning'
                              : 'cmms-badge-info'
                          }`}
                        >
                          {pm.complianceStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Event Date</th>
                  <th className="py-3 px-4">Machine</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Technical Summary</th>
                  <th className="py-3 px-4">Parts Replaced</th>
                  <th className="py-3 px-4">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.machineHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No machine lifecycle events registered.
                    </td>
                  </tr>
                ) : (
                  data.machineHistory.map((mh) => (
                    <tr key={mh.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">{mh.eventDate}</td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        {getMachineLabel(mh.machineId)}
                      </td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--accent-text)]">{mh.eventType}</td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">{mh.summary}</td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">{mh.partsReplaced || '—'}</td>
                      <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--text-primary)]">
                        ${mh.costIncurred.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cmms-card rounded-md max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                {subTab === 'breakdowns'
                  ? 'Log Emergency Machine Breakdown'
                  : subTab === 'daily'
                  ? 'Record Shift Daily Maintenance Check'
                  : 'Create Preventive Maintenance Schedule'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs font-mono-tech text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded bg-[var(--bg-secondary)]"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {subTab === 'breakdowns' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Ticket Code</label>
                      <input
                        required
                        value={bdForm.ticketCode}
                        onChange={(e) => setBdForm({ ...bdForm, ticketCode: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Severity</label>
                      <select
                        value={bdForm.severity}
                        onChange={(e) => setBdForm({ ...bdForm, severity: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                      >
                        <option value="Critical">Critical</option>
                        <option value="Major">Major</option>
                        <option value="Minor">Minor</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Machine</label>
                    <select
                      value={bdForm.machineId}
                      onChange={(e) =>
                        setBdForm({ ...bdForm, machineId: Number(e.target.value) })
                      }
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                    >
                      {data.machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} — {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Failure Mode Description</label>
                    <input
                      required
                      value={bdForm.failureMode}
                      onChange={(e) => setBdForm({ ...bdForm, failureMode: e.target.value })}
                      placeholder="Spindle Drive Overcurrent Fault F3001"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                    />
                  </div>
                </>
              )}

              {subTab === 'daily' && (
                <>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Machine</label>
                    <select
                      value={dmForm.machineId}
                      onChange={(e) =>
                        setDmForm({ ...dmForm, machineId: Number(e.target.value) })
                      }
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                    >
                      {data.machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} — {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Inspection Title</label>
                      <input
                        required
                        value={dmForm.checklistTitle}
                        onChange={(e) => setDmForm({ ...dmForm, checklistTitle: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Duty Shift (12-Hr Schedule)</label>
                      <select
                        value={dmForm.shift}
                        onChange={(e) => setDmForm({ ...dmForm, shift: e.target.value as any })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      >
                        {PLANT_SHIFTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Pressure (bar)</label>
                      <input
                        value={dmForm.pressureBar}
                        onChange={(e) => setDmForm({ ...dmForm, pressureBar: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Temp (°C)</label>
                      <input
                        value={dmForm.temperatureCelsius}
                        onChange={(e) =>
                          setDmForm({ ...dmForm, temperatureCelsius: e.target.value })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Vibration (mm/s)</label>
                      <input
                        value={dmForm.vibrationMmS}
                        onChange={(e) => setDmForm({ ...dmForm, vibrationMmS: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </>
              )}

              {subTab === 'preventive' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Schedule Code</label>
                      <input
                        required
                        value={pmForm.scheduleCode}
                        onChange={(e) => setPmForm({ ...pmForm, scheduleCode: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Next Due Date</label>
                      <input
                        type="date"
                        required
                        value={pmForm.nextDueDate}
                        onChange={(e) => setPmForm({ ...pmForm, nextDueDate: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Machine</label>
                    <select
                      value={pmForm.machineId}
                      onChange={(e) =>
                        setPmForm({ ...pmForm, machineId: Number(e.target.value) })
                      }
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                    >
                      {data.machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} — {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">PM Task Title</label>
                    <input
                      required
                      value={pmForm.title}
                      onChange={(e) => setPmForm({ ...pmForm, title: e.target.value })}
                      placeholder="500-Hr Ball Screw Backlash & Servo Tuning Check"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-[var(--accent-color)] hover:opacity-90 text-white font-semibold shadow-xs transition-opacity"
                >
                  {submitting ? 'Syncing...' : 'Commit Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
