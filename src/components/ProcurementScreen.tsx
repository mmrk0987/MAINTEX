import React, { useState } from 'react';
import { CheckCircle2, ClipboardList, FileCheck2, Plus, ShoppingCart } from 'lucide-react';
import { PlantStateData } from '../types.ts';

interface ProcurementScreenProps {
  data: PlantStateData;
  onCreateRequisition: (payload: any) => Promise<void>;
  onApproveRequisition: (payload: any) => Promise<void>;
}

export const ProcurementScreen: React.FC<ProcurementScreenProps> = ({
  data,
  onCreateRequisition,
  onApproveRequisition,
}) => {
  const [subTab, setSubTab] = useState<'requisitions' | 'approvals' | 'purchases'>('requisitions');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [reqForm, setReqForm] = useState({
    reqNumber: `PR-${new Date().getFullYear()}-${String(data.requisitions.length + 1).padStart(3, '0')}`,
    sparePartId: data.spareParts[0]?.id || 0,
    itemDescription: '',
    requestedQty: 1,
    estimatedTotalCost: 0,
    departmentId: data.departments[0]?.id || 0,
    urgency: 'High',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateRequisition({
        ...reqForm,
        sparePartId: Number(reqForm.sparePartId),
        requestedQty: Number(reqForm.requestedQty),
        estimatedTotalCost: Number(reqForm.estimatedTotalCost),
        departmentId: Number(reqForm.departmentId),
      });
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cmms-card rounded-md p-3">
        <div className="overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex items-center gap-2 min-w-0">
          {[
            {
              id: 'requisitions',
              label: 'Requisitions',
              count: data.requisitions.length,
              icon: ClipboardList,
            },
            {
              id: 'approvals',
              label: 'Approvals Log',
              count: data.approvals.length,
              icon: FileCheck2,
            },
            {
              id: 'purchases',
              label: 'Purchase History (POs)',
              count: data.purchaseHistory.length,
              icon: ShoppingCart,
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

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-[var(--accent-color)] hover:opacity-90 text-white text-xs font-semibold shadow-xs transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Requisition</span>
        </button>
      </div>

      <div className="cmms-card rounded-md overflow-hidden">
        {subTab === 'requisitions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">PR Number</th>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Est. Total Cost</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Status / Approval Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.requisitions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No purchase requisitions on record.
                    </td>
                  </tr>
                ) : (
                  data.requisitions.map((req) => (
                    <tr key={req.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                        {req.reqNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{req.itemDescription}</td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--text-primary)]">{req.requestedQty}</td>
                      <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--text-primary)]">
                        ${req.estimatedTotalCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded ${
                            req.urgency === 'Emergency'
                              ? 'cmms-badge-critical'
                              : 'cmms-badge-warning'
                          }`}
                        >
                          {req.urgency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{req.requestedBy}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded ${
                              req.status === 'Pending Approval'
                                ? 'cmms-badge-warning'
                                : 'cmms-badge-success'
                            }`}
                          >
                            {req.status}
                          </span>
                          {req.status === 'Pending Approval' && (
                            <button
                              onClick={() =>
                                onApproveRequisition({
                                  requisitionId: req.id,
                                  decision: 'Approved',
                                  comments: 'Approved & PO Dispatched to Authorized OEM Vendor',
                                  vendorName: 'Rexroth Industrial Direct GmbH',
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--accent-color)] hover:opacity-90 text-white text-[11px] font-semibold transition-opacity"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve & Issue PO
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

        {subTab === 'approvals' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Requisition Ref</th>
                  <th className="py-3 px-4">Approver</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4">Audit Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.approvals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No approval audit entries recorded.
                    </td>
                  </tr>
                ) : (
                  data.approvals.map((ap) => {
                    const req = data.requisitions.find((r) => r.id === ap.requisitionId);
                    return (
                      <tr key={ap.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                          {req?.reqNumber || `REQ-${ap.requisitionId}`}
                        </td>
                        <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{ap.approverName}</td>
                        <td className="py-3 px-4 text-[var(--text-secondary)]">{ap.approverRole}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded cmms-badge-success">
                            {ap.decision}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-secondary)]">{ap.comments}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Vendor Name</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs">
                {data.purchaseHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono-tech">
                      No purchase orders dispatched yet.
                    </td>
                  </tr>
                ) : (
                  data.purchaseHistory.map((po) => (
                    <tr key={po.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="py-3 px-4 font-mono-tech font-semibold text-[var(--accent-text)]">
                        {po.poNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{po.vendorName}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{po.itemsSummary}</td>
                      <td className="py-3 px-4 font-mono-tech font-bold text-[var(--text-primary)]">
                        ${po.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono-tech text-[var(--text-secondary)]">{po.orderDate}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono-tech text-[11px] font-semibold px-2 py-0.5 rounded ${
                            po.deliveryStatus === 'Delivered'
                              ? 'cmms-badge-success'
                              : 'cmms-badge-info'
                          }`}
                        >
                          {po.deliveryStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Requisition Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="cmms-card rounded-md max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Raise MRO Purchase Requisition
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs font-mono-tech text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded bg-[var(--bg-secondary)]"
              >
                ESC
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">PR Number</label>
                  <input
                    required
                    value={reqForm.reqNumber}
                    onChange={(e) => setReqForm({ ...reqForm, reqNumber: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Urgency</label>
                  <select
                    value={reqForm.urgency}
                    onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                  >
                    <option value="Emergency">Emergency</option>
                    <option value="High">High</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-medium">Item Description</label>
                <input
                  required
                  value={reqForm.itemDescription}
                  onChange={(e) => setReqForm({ ...reqForm, itemDescription: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Requested Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={reqForm.requestedQty}
                    onChange={(e) =>
                      setReqForm({ ...reqForm, requestedQty: Number(e.target.value) })
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-medium">Estimated Cost ($)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={reqForm.estimatedTotalCost}
                    onChange={(e) =>
                      setReqForm({ ...reqForm, estimatedTotalCost: Number(e.target.value) })
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-[var(--text-primary)] font-mono-tech focus:border-[var(--accent-color)] focus:outline-hidden"
                  />
                </div>
              </div>

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
                  {submitting ? 'Submitting...' : 'Submit Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
