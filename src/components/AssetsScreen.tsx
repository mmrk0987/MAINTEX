import React, { useMemo, useState } from 'react';
import { Boxes, Cpu, Layers, Plus, Search, Settings2, X } from 'lucide-react';
import { PlantStateData } from '../types.ts';

interface AssetsScreenProps {
  data: PlantStateData;
  onCreateSection: (payload: any) => Promise<void>;
  onCreateMachine: (payload: any) => Promise<void>;
  onCreateComponent: (payload: any) => Promise<void>;
  onCreateSparePart: (payload: any) => Promise<void>;
}

export const AssetsScreen: React.FC<AssetsScreenProps> = ({
  data,
  onCreateSection,
  onCreateMachine,
  onCreateComponent,
  onCreateSparePart,
}) => {
  const [subTab, setSubTab] = useState<'sections' | 'machines' | 'components' | 'spare_parts'>(
    'machines'
  );
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredMachines = useMemo(() => {
    const q = machineSearchQuery.trim().toLowerCase();
    if (!q) return data.machines;
    return data.machines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q)
    );
  }, [data.machines, machineSearchQuery]);

  // Form states
  const [secForm, setSecForm] = useState({
    code: `SEC-0${data.sections.length + 1}`,
    name: '',
    departmentId: data.departments[0]?.id || 0,
    supervisor: '',
    floorZone: '',
    status: 'Operational',
  });

  const [mchForm, setMchForm] = useState({
    code: `MCH-CNC-${101 + data.machines.length}`,
    name: '',
    sectionId: data.sections[0]?.id || 0,
    manufacturer: '',
    modelNumber: '',
    serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
    criticality: 'Critical',
    status: 'Running',
    installedDate: new Date().toISOString().slice(0, 10),
  });

  const [cmpForm, setCmpForm] = useState({
    code: `CMP-0${data.components.length + 1}`,
    name: '',
    machineId: data.machines[0]?.id || 0,
    category: 'Mechanical',
    specification: '',
    condition: 'Optimal',
    installedDate: new Date().toISOString().slice(0, 10),
  });

  const [spForm, setSpForm] = useState({
    partNumber: `SP-OEM-${Math.floor(100 + Math.random() * 899)}`,
    name: '',
    componentId: data.components[0]?.id || 0,
    machineId: data.machines[0]?.id || 0,
    category: 'Hydraulic',
    unit: 'PCS',
    unitCost: 350,
    minStockLevel: 4,
    leadTimeDays: 7,
    initialStock: 10,
    binLocation: 'AISLE-B2-BIN08',
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (subTab === 'sections') {
        const payload = {
          ...secForm,
          departmentId: Number(secForm.departmentId) || data.departments[0]?.id || 1,
        };
        await onCreateSection(payload);
        setSecForm({
          code: `SEC-0${data.sections.length + 2}`,
          name: '',
          departmentId: data.departments[0]?.id || 1,
          supervisor: '',
          floorZone: '',
          status: 'Operational',
        });
      } else if (subTab === 'machines') {
        const payload = {
          ...mchForm,
          sectionId: Number(mchForm.sectionId) || data.sections[0]?.id || 1,
        };
        await onCreateMachine(payload);
        setMchForm({
          code: `MCH-CNC-${102 + data.machines.length}`,
          name: '',
          sectionId: data.sections[0]?.id || 1,
          manufacturer: '',
          modelNumber: '',
          serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
          criticality: 'Critical',
          status: 'Running',
          installedDate: new Date().toISOString().slice(0, 10),
        });
      } else if (subTab === 'components') {
        const payload = {
          ...cmpForm,
          machineId: Number(cmpForm.machineId) || data.machines[0]?.id || 1,
        };
        await onCreateComponent(payload);
        setCmpForm({
          code: `CMP-0${data.components.length + 2}`,
          name: '',
          machineId: data.machines[0]?.id || 1,
          category: 'Mechanical',
          specification: '',
          condition: 'Optimal',
          installedDate: new Date().toISOString().slice(0, 10),
        });
      } else {
        const payload = {
          ...spForm,
          componentId: Number(spForm.componentId) || data.components[0]?.id || null,
          machineId: Number(spForm.machineId) || data.machines[0]?.id || null,
          unitCost: Number(spForm.unitCost) || 0,
          minStockLevel: Number(spForm.minStockLevel) || 5,
          leadTimeDays: Number(spForm.leadTimeDays) || 7,
          initialStock: Number(spForm.initialStock) || 0,
        };
        await onCreateSparePart(payload);
        setSpForm({
          partNumber: `SP-OEM-${Math.floor(100 + Math.random() * 899)}`,
          name: '',
          componentId: data.components[0]?.id || 0,
          machineId: data.machines[0]?.id || 0,
          category: 'Hydraulic',
          unit: 'PCS',
          unitCost: 350,
          minStockLevel: 4,
          leadTimeDays: 7,
          initialStock: 10,
          binLocation: 'AISLE-B2-BIN08',
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
            { id: 'sections', label: 'Sections', count: data.sections.length, icon: Layers },
            { id: 'machines', label: 'Machines', count: data.machines.length, icon: Cpu },
            {
              id: 'components',
              label: 'Components',
              count: data.components.length,
              icon: Settings2,
            },
            { id: 'spare_parts', label: 'Spare Parts', count: data.spareParts.length, icon: Boxes },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border min-h-[36px] ${
                  active
                    ? 'cmms-badge-info border-[var(--accent-color)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[var(--accent-text)] shrink-0" />
                <span>{tab.label}</span>
                <span className="font-mono-tech text-[11px] px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[var(--accent-text)] font-semibold">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {subTab === 'machines' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={machineSearchQuery}
                onChange={(e) => setMachineSearchQuery(e.target.value)}
                placeholder="Search machine name or code..."
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--accent-color)] rounded pl-8 pr-7 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
              />
              {machineSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMachineSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>
              Add{' '}
              {subTab === 'sections'
                ? 'Section'
                : subTab === 'machines'
                ? 'Machine'
                : subTab === 'components'
                ? 'Component'
                : 'Spare Part'}
            </span>
          </button>
        </div>
      </div>

      {/* Tables per sub-tab */}
      <div className="cmms-card rounded-md overflow-hidden">
        {subTab === 'sections' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Section Code</th>
                  <th className="py-3 px-4">Section Name</th>
                  <th className="py-3 px-4">Floor Zone</th>
                  <th className="py-3 px-4">Supervisor</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.sections.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                      {s.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{s.name}</td>
                    <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">{s.floorZone}</td>
                    <td className="py-3 px-4 text-[var(--text-primary)]">{s.supervisor}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono-tech text-[11px] px-2 py-0.5 rounded cmms-badge-success font-semibold">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'machines' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Machine Name</th>
                  <th className="py-3 px-4">OEM / Model / Serial</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Criticality</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {filteredMachines.length > 0 ? (
                  filteredMachines.map((m) => (
                    <tr key={m.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                        {m.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{m.name}</td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">
                        {m.manufacturer} • {m.modelNumber} ({m.serialNumber})
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {data.sections.find((s) => s.id === m.sectionId)?.name ||
                          `Section #${m.sectionId}`}
                      </td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--text-primary)]">{m.criticality}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono-tech text-[11px] px-2 py-0.5 rounded font-semibold ${
                            m.status === 'Running'
                              ? 'cmms-badge-success'
                              : m.status === 'Breakdown'
                              ? 'cmms-badge-critical'
                              : 'cmms-badge-warning'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-xs text-[var(--text-secondary)]">
                      No machines found matching{' '}
                      <span className="font-mono-tech text-[var(--accent-text)]">
                        &ldquo;{machineSearchQuery}&rdquo;
                      </span>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'components' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Component Code</th>
                  <th className="py-3 px-4">Component Name</th>
                  <th className="py-3 px-4">Parent Machine</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Technical Spec</th>
                  <th className="py-3 px-4">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.components.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                      {c.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{c.name}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {data.machines.find((m) => m.id === c.machineId)?.name ||
                        `Machine #${c.machineId}`}
                    </td>
                    <td className="py-3 px-4 font-mono-tech text-[var(--accent-text)]">{c.category}</td>
                    <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">{c.specification}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono-tech text-[11px] px-2 py-0.5 rounded font-semibold ${
                          c.condition === 'Optimal' || c.condition === 'Good'
                            ? 'cmms-badge-success'
                            : 'cmms-badge-warning'
                        }`}
                      >
                        {c.condition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'spare_parts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Part Number</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Unit Cost</th>
                  <th className="py-3 px-4">Min Stock</th>
                  <th className="py-3 px-4">Lead Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.spareParts.map((sp) => (
                  <tr key={sp.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                      {sp.partNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{sp.name}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{sp.category}</td>
                    <td className="py-3 px-4 font-mono-tech text-[var(--text-primary)]">
                      ${sp.unitCost.toLocaleString()} / {sp.unit}
                    </td>
                    <td className="py-3 px-4 font-mono-tech text-amber-500 font-semibold">
                      {sp.minStockLevel} {sp.unit}
                    </td>
                    <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">
                      {sp.leadTimeDays} Days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="cmms-card rounded-md max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Register New{' '}
                {subTab === 'sections'
                  ? 'Plant Section'
                  : subTab === 'machines'
                  ? 'Industrial Machine'
                  : subTab === 'components'
                  ? 'Machine Sub-Component'
                  : 'MRO Spare Part'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              {subTab === 'sections' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Section Code</label>
                      <input
                        required
                        value={secForm.code}
                        onChange={(e) => setSecForm({ ...secForm, code: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Supervisor</label>
                      <input
                        required
                        value={secForm.supervisor}
                        onChange={(e) => setSecForm({ ...secForm, supervisor: e.target.value })}
                        placeholder="Engr. R. Vance"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">Section Name</label>
                    <input
                      required
                      value={secForm.name}
                      onChange={(e) => setSecForm({ ...secForm, name: e.target.value })}
                      placeholder="Automated Stamping & Die Line"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">Floor Zone</label>
                    <input
                      required
                      value={secForm.floorZone}
                      onChange={(e) => setSecForm({ ...secForm, floorZone: e.target.value })}
                      placeholder="Hall 2 - Bay C"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)]"
                    />
                  </div>
                </>
              )}

              {subTab === 'machines' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Machine Code</label>
                      <input
                        required
                        value={mchForm.code}
                        onChange={(e) => setMchForm({ ...mchForm, code: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Section</label>
                      <select
                        value={mchForm.sectionId}
                        onChange={(e) =>
                          setMchForm({ ...mchForm, sectionId: Number(e.target.value) })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] cursor-pointer"
                      >
                        {data.sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} — {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">Machine Name</label>
                    <input
                      required
                      value={mchForm.name}
                      onChange={(e) => setMchForm({ ...mchForm, name: e.target.value })}
                      placeholder="Okuma MULTUS U4000 CNC Turn-Mill"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Manufacturer</label>
                      <input
                        required
                        value={mchForm.manufacturer}
                        onChange={(e) => setMchForm({ ...mchForm, manufacturer: e.target.value })}
                        placeholder="Okuma Corp"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Model Number</label>
                      <input
                        required
                        value={mchForm.modelNumber}
                        onChange={(e) => setMchForm({ ...mchForm, modelNumber: e.target.value })}
                        placeholder="MULTUS-U4000"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                      />
                    </div>
                  </div>
                </>
              )}

              {subTab === 'components' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Component Code</label>
                      <input
                        required
                        value={cmpForm.code}
                        onChange={(e) => setCmpForm({ ...cmpForm, code: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Parent Machine</label>
                      <select
                        value={cmpForm.machineId}
                        onChange={(e) =>
                          setCmpForm({ ...cmpForm, machineId: Number(e.target.value) })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] cursor-pointer"
                      >
                        {data.machines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.code} — {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">Component Name</label>
                    <input
                      required
                      value={cmpForm.name}
                      onChange={(e) => setCmpForm({ ...cmpForm, name: e.target.value })}
                      placeholder="Heidenhain Linear Optical Scale Encoder"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">Specification</label>
                    <input
                      required
                      value={cmpForm.specification}
                      onChange={(e) => setCmpForm({ ...cmpForm, specification: e.target.value })}
                      placeholder=" ±3 µm Accuracy / EnDat 2.2 Interface"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                    />
                  </div>
                </>
              )}

              {subTab === 'spare_parts' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Part Number (SKU)</label>
                      <input
                        required
                        value={spForm.partNumber}
                        onChange={(e) => setSpForm({ ...spForm, partNumber: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Bin Location</label>
                      <input
                        required
                        value={spForm.binLocation}
                        onChange={(e) => setSpForm({ ...spForm, binLocation: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">Part Name</label>
                    <input
                      required
                      value={spForm.name}
                      onChange={(e) => setSpForm({ ...spForm, name: e.target.value })}
                      placeholder="Festo Solenoid Manifold Valve 24VDC"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Unit Cost ($)</label>
                      <input
                        type="number"
                        required
                        value={spForm.unitCost}
                        onChange={(e) =>
                          setSpForm({ ...spForm, unitCost: Number(e.target.value) })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Initial Qty</label>
                      <input
                        type="number"
                        required
                        value={spForm.initialStock}
                        onChange={(e) =>
                          setSpForm({ ...spForm, initialStock: Number(e.target.value) })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1">Min Alert Qty</label>
                      <input
                        type="number"
                        required
                        value={spForm.minStockLevel}
                        onChange={(e) =>
                          setSpForm({ ...spForm, minStockLevel: Number(e.target.value) })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save to PostgreSQL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
