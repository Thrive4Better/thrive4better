import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import SlideOver from '@/components/ui/SlideOver';
import { Sparkles, Check, X, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CarePlanSectionType } from '@/types';

// ── Types ──

interface GeneratedGoal {
  description: string;
  targetDate: string;
  rationale: string;
}

interface GeneratedPlan {
  supportNeedsSummary: string;
  goals: GeneratedGoal[];
  preferredRoutines: string;
  riskNotes: string;
  communicationStrategies: string;
}

interface AiSupportPlanGeneratorProps {
  clientId: string;
  onClose: () => void;
  onApply: (planData: GeneratedPlan) => void;
}

// ── Section generation helper (exported for use in modular care plan) ──

export async function generateSectionContent(
  clientId: string,
  sectionType: CarePlanSectionType,
  existingSectionsContext?: string,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  const response = await fetch('/api/generate-support-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      clientId,
      sectionType,
      existingSectionsContext,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate section content');
  }

  return data.sectionContent;
}

// ── Component ──

export default function AiSupportPlanGenerator({ clientId, onClose, onApply }: AiSupportPlanGeneratorProps) {
  const { getClientById, getCarePlanByClient } = useStore();
  const client = getClientById(clientId);
  const carePlan = getCarePlanByClient(clientId);

  const [additionalContext, setAdditionalContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [acceptedGoals, setAcceptedGoals] = useState<Set<number>>(new Set());
  const [rejectedGoals, setRejectedGoals] = useState<Set<number>>(new Set());

  // Editable fields
  const [editSummary, setEditSummary] = useState('');
  const [editRoutines, setEditRoutines] = useState('');
  const [editRisks, setEditRisks] = useState('');
  const [editComm, setEditComm] = useState('');
  const [editGoals, setEditGoals] = useState<GeneratedGoal[]>([]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setPlan(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated. Please log in again.');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/generate-support-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clientId, additionalContext: additionalContext.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate plan');
        setIsLoading(false);
        return;
      }

      const generated = data.plan as GeneratedPlan;
      setPlan(generated);
      setEditSummary(generated.supportNeedsSummary);
      setEditRoutines(generated.preferredRoutines);
      setEditRisks(generated.riskNotes);
      setEditComm(generated.communicationStrategies);
      setEditGoals([...generated.goals]);
      setAcceptedGoals(new Set(generated.goals.map((_: any, i: number) => i)));
      setRejectedGoals(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGoal = (index: number, accept: boolean) => {
    if (accept) {
      setAcceptedGoals((prev) => { const n = new Set(prev); n.add(index); return n; });
      setRejectedGoals((prev) => { const n = new Set(prev); n.delete(index); return n; });
    } else {
      setRejectedGoals((prev) => { const n = new Set(prev); n.add(index); return n; });
      setAcceptedGoals((prev) => { const n = new Set(prev); n.delete(index); return n; });
    }
  };

  const handleApply = () => {
    if (!plan) return;

    const finalGoals = editGoals.filter((_, i) => acceptedGoals.has(i));

    onApply({
      supportNeedsSummary: editSummary,
      goals: finalGoals,
      preferredRoutines: editRoutines,
      riskNotes: editRisks,
      communicationStrategies: editComm,
    });

    toast.success('AI support plan applied');
    onClose();
  };

  const updateGoalField = (index: number, field: keyof GeneratedGoal, value: string) => {
    setEditGoals((prev) => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  };

  return (
    <SlideOver open onClose={onClose} title="AI Support Plan Generator" wide>
      <div className="space-y-6">
        {/* Client context */}
        {client && (
          <div className="bg-sage-pale/50 rounded-xl p-4">
            <p className="text-sm font-medium text-charcoal">
              {client.firstName} {client.lastName}
            </p>
            <p className="text-xs text-mid-gray mt-1">
              NDIS: {client.ndisNumber} &middot; {client.fundingType}
            </p>
            {carePlan && carePlan.goals.length > 0 && (
              <p className="text-xs text-mid-gray mt-1">
                {carePlan.goals.length} existing goal{carePlan.goals.length !== 1 ? 's' : ''} in care plan
              </p>
            )}
          </div>
        )}

        {/* Generate form */}
        {!plan && !isLoading && (
          <>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Additional context <span className="text-mid-gray font-normal">(optional)</span>
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="E.g., Recent changes in circumstances, new interests, specific areas to focus on..."
                rows={4}
                className="input-field resize-none"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              Generate Plan
            </button>
          </>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <Sparkles size={32} className="text-forest animate-pulse" />
              <Loader2 size={48} className="text-sage animate-spin absolute -top-2 -left-2" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-charcoal">Generating support plan...</p>
              <p className="text-xs text-mid-gray mt-1">Analysing participant data and session notes</p>
            </div>
          </div>
        )}

        {/* Review panel */}
        {plan && !isLoading && (
          <div className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Support Needs Summary */}
            <section>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">
                Support Needs Summary
              </label>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={4}
                className="input-field resize-none text-sm"
              />
            </section>

            {/* Goals */}
            <section>
              <label className="block text-sm font-semibold text-charcoal mb-2">
                Goals ({acceptedGoals.size} accepted, {rejectedGoals.size} rejected)
              </label>
              <div className="space-y-3">
                {editGoals.map((goal, index) => {
                  const isAccepted = acceptedGoals.has(index);
                  const isRejected = rejectedGoals.has(index);

                  return (
                    <div
                      key={index}
                      className={`border rounded-xl p-4 transition-colors ${
                        isRejected
                          ? 'border-red-200 bg-red-50/50 opacity-60'
                          : isAccepted
                          ? 'border-sage bg-sage-pale/30'
                          : 'border-sage-pale'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <textarea
                          value={goal.description}
                          onChange={(e) => updateGoalField(index, 'description', e.target.value)}
                          rows={2}
                          className="flex-1 text-sm bg-transparent border-none focus:outline-none resize-none text-charcoal"
                        />
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => toggleGoal(index, true)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isAccepted ? 'bg-green-100 text-green-600' : 'hover:bg-sage-pale text-mid-gray'
                            }`}
                            title="Accept goal"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => toggleGoal(index, false)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isRejected ? 'bg-red-100 text-red-500' : 'hover:bg-sage-pale text-mid-gray'
                            }`}
                            title="Reject goal"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-mid-gray mt-1">
                        <span>Target: </span>
                        <input
                          type="date"
                          value={goal.targetDate}
                          onChange={(e) => updateGoalField(index, 'targetDate', e.target.value)}
                          className="bg-transparent border-none text-xs text-mid-gray focus:outline-none"
                        />
                      </div>
                      <p className="text-xs text-mid-gray mt-2 italic">{goal.rationale}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Preferred Routines */}
            <section>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">
                Preferred Routines
              </label>
              <textarea
                value={editRoutines}
                onChange={(e) => setEditRoutines(e.target.value)}
                rows={3}
                className="input-field resize-none text-sm"
              />
            </section>

            {/* Risk Notes */}
            <section>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">
                Risk Notes
              </label>
              <textarea
                value={editRisks}
                onChange={(e) => setEditRisks(e.target.value)}
                rows={3}
                className="input-field resize-none text-sm"
              />
            </section>

            {/* Communication Strategies */}
            <section>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">
                Communication Strategies
              </label>
              <textarea
                value={editComm}
                onChange={(e) => setEditComm(e.target.value)}
                rows={3}
                className="input-field resize-none text-sm"
              />
            </section>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-sage-pale">
              <button
                onClick={handleGenerate}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-forest bg-sage-pale rounded-xl hover:bg-sage-light transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleApply}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
                disabled={acceptedGoals.size === 0}
              >
                <Check size={16} />
                Apply to Care Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </SlideOver>
  );
}
