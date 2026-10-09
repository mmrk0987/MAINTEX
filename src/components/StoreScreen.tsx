import React, { useState } from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Package, Plus } from 'lucide-react';
import { PlantStateData } from '../types.ts';

interface StoreScreenProps {
  data: PlantStateData;
  onIssueStock: (payload: any) => Promise<void>;
  onReceiveStock: (payload: any) => Promise<void>;
}

export const StoreScreen: React.FC<StoreScreenProps> = ({
  data,
  onIssueStock,
  onReceiveStock,
}) => {
  const [subTab, setSubTab] = useState<'stock' | 'issues' | 'receives' | 'alerts'>('stock');
  const [modalMode, setModalMode] = useState<'issue' | 'receive' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [issueForm, setIssueForm] = useState({
    issueCode: `ISS-${new Date().getFullYear()}-${String(data.stockIssues.length + 1).padStart(3, '0')}`,
    sparePartId: data.spareParts[0]?.id || 0,
    machineId: data.machines[0]?.id || 0,
    quantityIssued: 1,
    issuedTo: '',
    workOrderRef: '',
  });

  const [receiveForm, setReceiveForm] = useState({
    grnCode: `GRN-${new Date().getFullYear()}-${String(data.stockReceives.length + 1).padStart(3, '0')}`,
    sparePartId: data.spareParts[0]?.id || 0,
    supplierName: '',
    quantityReceived: 1,
    unitPrice: 0,
    invoiceNumber: '',
  });

  const getPart = (id: number) => data.spareParts.find((p) => p.id === id);
  const getMachineCode = (id: number | null) =>
    id ? data.machines.find((m) => m.id === id)?.code || `MCH-${id}` : 'N/A';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modalMode === 'issue') {
        await onIssueStock({
          ...issueForm,
          sparePartId: Number(issueForm.sparePartId),
          machineId: Number(issueForm.machineId),
          quantityIssued: Number(issueForm.quantityIssued),
        });
      } else if (modalMode === 'receive') {
        await onReceiveStock({
          ...receiveForm,
          sparePartId: Number(receiveForm.sparePartId),
          quantityReceived: Number(receiveForm.quantityReceived),
          unitPrice: Number(receiveForm.unitPrice),
        });
      }
      setModalMode(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation & Store Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cmms-card rounded-md p-3">
        <div className="overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex items-center gap-2 min-w-0">
          {[
            { id: 'stock', label: 'Spare Stock', count: data.spareStock.length, icon: Package },
            {
              id: 'issues',
              label: 'Stock Issues',
              count: data.stockIssues.length,
              icon: ArrowUpRight,
            },
            {
              id: 'receives',
              label: 'Stock Receives (GRN)',
              count: data.stockReceives.length,
              icon: ArrowDownLeft,
            },
            {
              id: 'alerts',
              label: 'Low Stock Alerts',
              count: data.lowStockAlerts.length,
              icon: AlertTriangle,
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalMode('issue')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold transition-colors"
          >
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
            <span>Issue Stock</span>
          </button>
          <button
            onClick={() => setModalMode('receive')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[var(--accent-color)] hover:opacity-90 text-white text-xs font-semibold shadow-xs transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Stock (GRN)</span>
          </button>
        </div>
      </div>

      {/* Store Tables */}
      <div className="cmms-card rounded-md overflow-hidden">
        {subTab === 'stock' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Part Number</th>
                  <th className="py-3 px-4">Spare Part Name</th>
                  <th className="py-3 px-4">Bin Location</th>
                  <th className="py-3 px-4">On-Hand Qty</th>
                  <th className="py-3 px-4">Reorder Point</th>
                  <th className="py-3 px-4">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.spareStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No spare inventory items recorded.
                    </td>
                  </tr>
                ) : (
                  data.spareStock.map((st) => {
                    const part = getPart(st.sparePartId);
                    const isLow = st.quantityOnHand <= st.reorderPoint;
                    return (
                      <tr key={st.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                          {part?.partNumber || `SP-${st.sparePartId}`}
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                          {part?.name || `Spare Part #${st.sparePartId}`}
                        </td>
                        <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">{st.binLocation}</td>
                        <td className="py-3 px-4 font-mono-tech font-bold text-[var(--text-primary)]">
                          {st.quantityOnHand} {part?.unit || 'PCS'}
                        </td>
                        <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">
                          {st.reorderPoint} {part?.unit || 'PCS'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded ${
                              isLow
                                ? 'cmms-badge-critical'
                                : 'cmms-badge-success'
                            }`}
                          >
                            {isLow ? 'LOW STOCK ALERT' : 'OPTIMAL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'issues' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Issue Code</th>
                  <th className="py-3 px-4">Spare Part</th>
                  <th className="py-3 px-4">Target Machine</th>
                  <th className="py-3 px-4">Qty Issued</th>
                  <th className="py-3 px-4">Issued To</th>
                  <th className="py-3 px-4">Work Order Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.stockIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No stock issue transactions recorded.
                    </td>
                  </tr>
                ) : (
                  data.stockIssues.map((iss) => {
                    const part = getPart(iss.sparePartId);
                    return (
                      <tr key={iss.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                          {iss.issueCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                          {part?.partNumber} — {part?.name}
                        </td>
                        <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">
                          {getMachineCode(iss.machineId)}
                        </td>
                        <td className="py-3 px-4 font-mono-tech text-amber-500 font-bold">
                          -{iss.quantityIssued} {part?.unit || 'PCS'}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-primary)]">{iss.issuedTo}</td>
                        <td className="py-3 px-4 font-mono-tech text-[var(--accent-text)]">
                          {iss.workOrderRef}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'receives' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">GRN Code</th>
                  <th className="py-3 px-4">Spare Part</th>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Qty Received</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Invoice Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.stockReceives.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No stock receipt (GRN) records logged.
                    </td>
                  </tr>
                ) : (
                  data.stockReceives.map((rec) => {
                    const part = getPart(rec.sparePartId);
                    return (
                      <tr key={rec.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                          {rec.grnCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                          {part?.partNumber} — {part?.name}
                        </td>
                        <td className="py-3 px-4 text-[var(--text-primary)]">{rec.supplierName}</td>
                        <td className="py-3 px-4 font-mono-tech text-emerald-500 font-bold">
                          +{rec.quantityReceived} {part?.unit || 'PCS'}
                        </td>
                        <td className="py-3 px-4 font-mono-tech text-[var(--text-primary)]">${rec.unitPrice}</td>
                        <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">
                          {rec.invoiceNumber}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'alerts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Spare Part</th>
                  <th className="py-3 px-4">Current Qty</th>
                  <th className="py-3 px-4">Min Threshold</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Alert Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.lowStockAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      All spare parts inventory are above safety thresholds.
                    </td>
                  </tr>
                ) : (
                  data.lowStockAlerts.map((al) => {
                    const part = getPart(al.sparePartId);
                    return (
                      <tr key={al.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                          <span className="font-mono-tech text-[var(--accent-text)] mr-2">
                            {part?.partNumber}
                          </span>
                          {part?.name}
                        </td>
                        <td className="py-3 px-4 font-mono-tech font-bold text-red-500">
                          {al.currentQty}
                        </td>
                        <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">
                          {al.thresholdQty}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded ${
                              al.severity === 'Critical'
                                ? 'cmms-badge-critical'
                                : 'cmms-badge-warning'
                            }`}
                          >
                            {al.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono-tech text-[var(--text-primary)]">{al.alertStatus}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue / Receive Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cmms-card rounded-md max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                {modalMode === 'issue'
                  ? 'Issue Spare Part to Shop Floor'
                  : 'Receive Goods (GRN) into MRO Store'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-xs font-mono-tech text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded bg-[var(--bg-secondary)]"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {modalMode === 'issue' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Issue Code</label>
                      <input
                        required
                        value={issueForm.issueCode}
                        onChange={(e) => setIssueForm({ ...issueForm, issueCode: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Quantity to Issue</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={issueForm.quantityIssued}
                        onChange={(e) =>
                          setIssueForm({ ...issueForm, quantityIssued: Number(e.target.value) })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Spare Part</label>
                    <select
                      value={issueForm.sparePartId}
                      onChange={(e) =>
                        setIssueForm({ ...issueForm, sparePartId: Number(e.target.value) })
                      }
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                    >
                      {data.spareParts.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.partNumber} — {sp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Issued To Technician</label>
                      <input
                        required
                        value={issueForm.issuedTo}
                        onChange={(e) => setIssueForm({ ...issueForm, issuedTo: e.target.value })}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Work Order Ref</label>
                      <input
                        required
                        value={issueForm.workOrderRef}
                        onChange={(e) =>
                          setIssueForm({ ...issueForm, workOrderRef: e.target.value })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">GRN Code</label>
                      <input
                        required
                        value={receiveForm.grnCode}
                        onChange={(e) =>
                          setReceiveForm({ ...receiveForm, grnCode: e.target.value })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Quantity Received</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={receiveForm.quantityReceived}
                        onChange={(e) =>
                          setReceiveForm({
                            ...receiveForm,
                            quantityReceived: Number(e.target.value),
                          })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-medium">Spare Part</label>
                    <select
                      value={receiveForm.sparePartId}
                      onChange={(e) =>
                        setReceiveForm({ ...receiveForm, sparePartId: Number(e.target.value) })
                      }
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                    >
                      {data.spareParts.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.partNumber} — {sp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Supplier Name</label>
                      <input
                        required
                        value={receiveForm.supplierName}
                        onChange={(e) =>
                          setReceiveForm({ ...receiveForm, supplierName: e.target.value })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-medium">Invoice Number</label>
                      <input
                        required
                        value={receiveForm.invoiceNumber}
                        onChange={(e) =>
                          setReceiveForm({ ...receiveForm, invoiceNumber: e.target.value })
                        }
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-[var(--accent-color)] hover:opacity-90 text-white font-semibold shadow-xs transition-opacity"
                >
                  {submitting ? 'Updating Stock...' : 'Confirm Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
