import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { formatCurrency, cn } from '@/lib/utils';
import type { NdisRate } from '@/types';
import { ArrowLeft, Pencil, Check, X, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

type EditableFields = Pick<NdisRate, 'supportItemName' | 'lineItemCode' | 'supportCategory' | 'unit' | 'standardRate' | 'eveningRate' | 'nightRate' | 'saturdayRate' | 'sundayRate' | 'publicHolidayRate'>;

interface NdisRatesProps {
  modalMode?: boolean;
  onClose?: () => void;
}

export default function NdisRates({ modalMode, onClose }: NdisRatesProps = {}) {
  const navigate = useNavigate();
  const { ndisRates, updateNdisRate } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditableFields | null>(null);

  const startEdit = (rate: NdisRate) => {
    setEditingId(rate.id);
    setEditData({
      supportItemName: rate.supportItemName,
      lineItemCode: rate.lineItemCode,
      supportCategory: rate.supportCategory,
      unit: rate.unit,
      standardRate: rate.standardRate,
      eveningRate: rate.eveningRate,
      nightRate: rate.nightRate,
      saturdayRate: rate.saturdayRate,
      sundayRate: rate.sundayRate,
      publicHolidayRate: rate.publicHolidayRate,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = () => {
    if (!editingId || !editData) return;
    updateNdisRate(editingId, editData);
    toast.success('Rate updated');
    setEditingId(null);
    setEditData(null);
  };

  const updateField = (field: keyof EditableFields, value: string | number) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  const rateFields: { key: keyof Pick<NdisRate, 'standardRate' | 'eveningRate' | 'nightRate' | 'saturdayRate' | 'sundayRate' | 'publicHolidayRate'>; label: string }[] = [
    { key: 'standardRate', label: 'Standard' },
    { key: 'eveningRate', label: 'Evening' },
    { key: 'nightRate', label: 'Night' },
    { key: 'saturdayRate', label: 'Saturday' },
    { key: 'sundayRate', label: 'Sunday' },
    { key: 'publicHolidayRate', label: 'Public Holiday' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      {!modalMode && (
        <div className="flex items-center gap-3">
          <button onClick={() => modalMode && onClose ? onClose() : navigate('/invoices')} className="p-2 hover:bg-sage-pale rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-mid-gray" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-charcoal">NDIS Support Item Rates</h1>
            <p className="text-sm text-mid-gray mt-1">Manage hourly rates for NDIS support categories</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-sage-pale/50 border-b border-sage-light">
              <tr>
                <th className="table-header">Support Item Name</th>
                <th className="table-header">Line Item Code</th>
                <th className="table-header">Category</th>
                <th className="table-header">Unit</th>
                {rateFields.map((rf) => (
                  <th key={rf.key} className="table-header text-right">{rf.label}</th>
                ))}
                <th className="table-header w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-pale">
              {ndisRates.map((rate) => {
                const isEditing = editingId === rate.id;
                return (
                  <tr key={rate.id} className={cn('transition-colors', isEditing ? 'bg-sage-pale/30' : 'hover:bg-sage-pale/20')}>
                    {/* Name */}
                    <td className="table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData?.supportItemName ?? ''}
                          onChange={(e) => updateField('supportItemName', e.target.value)}
                          className="input-field text-xs"
                        />
                      ) : (
                        <span className="font-medium">{rate.supportItemName}</span>
                      )}
                    </td>
                    {/* Code */}
                    <td className="table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData?.lineItemCode ?? ''}
                          onChange={(e) => updateField('lineItemCode', e.target.value)}
                          className="input-field text-xs font-mono"
                        />
                      ) : (
                        <span className="font-mono text-xs">{rate.lineItemCode}</span>
                      )}
                    </td>
                    {/* Category */}
                    <td className="table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData?.supportCategory ?? ''}
                          onChange={(e) => updateField('supportCategory', e.target.value)}
                          className="input-field text-xs"
                        />
                      ) : (
                        <span className="text-sm">{rate.supportCategory}</span>
                      )}
                    </td>
                    {/* Unit */}
                    <td className="table-cell">
                      {isEditing ? (
                        <select
                          value={editData?.unit ?? 'Hour'}
                          onChange={(e) => updateField('unit', e.target.value as 'Hour' | 'Each')}
                          className="input-field text-xs"
                        >
                          <option value="Hour">Hour</option>
                          <option value="Each">Each</option>
                        </select>
                      ) : (
                        <span className="text-sm">{rate.unit}</span>
                      )}
                    </td>
                    {/* Rate columns */}
                    {rateFields.map((rf) => (
                      <td key={rf.key} className="table-cell text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editData?.[rf.key] ?? 0}
                            onChange={(e) => updateField(rf.key, parseFloat(e.target.value) || 0)}
                            className="input-field text-xs text-right w-24"
                          />
                        ) : (
                          <span className="text-sm tabular-nums">{formatCurrency(rate[rf.key])}</span>
                        )}
                      </td>
                    ))}
                    {/* Actions */}
                    <td className="table-cell text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={saveEdit}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                            title="Save"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-mid-gray hover:text-red-600 transition-colors"
                            title="Cancel"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(rate)}
                          className="p-1.5 rounded-lg hover:bg-sage-pale text-mid-gray hover:text-forest transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {ndisRates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-sage-pale flex items-center justify-center mb-4">
              <DollarSign size={28} className="text-sage" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-1">No NDIS rates configured</h3>
            <p className="text-sm text-mid-gray text-center max-w-sm">
              NDIS support item rates will appear here once added to the system.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
