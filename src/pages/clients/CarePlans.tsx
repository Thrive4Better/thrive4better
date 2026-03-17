import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { formatDate, generateId } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import AiSupportPlanGenerator from '@/components/ai/AiSupportPlanGenerator';
import { Heart, Target, ChevronRight, Calendar, ClipboardList, Sparkles } from 'lucide-react';
import type { Client, CarePlan, CarePlanGoal } from '@/types';

// ── Types ───────────────────────────────────────────────────────────────────

interface CarePlanSummary {
  client: Client;
  carePlan: CarePlan;
  goalCounts: {
    total: number;
    notStarted: number;
    inProgress: number;
    achieved: number;
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CarePlans() {
  const navigate = useNavigate();
  const { clients, carePlans, updateCarePlan } = useStore();
  const [aiGeneratorClientId, setAiGeneratorClientId] = useState<string | null>(null);

  const summaries: CarePlanSummary[] = useMemo(() => {
    return carePlans
      .map((plan) => {
        const client = clients.find((c) => c.id === plan.clientId);
        if (!client) return null;

        const goals = plan.goals;
        const goalCounts = {
          total: goals.length,
          notStarted: goals.filter((g: CarePlanGoal) => g.status === 'Not Started').length,
          inProgress: goals.filter((g: CarePlanGoal) => g.status === 'In Progress').length,
          achieved: goals.filter((g: CarePlanGoal) => g.status === 'Achieved').length,
        };

        return { client, carePlan: plan, goalCounts };
      })
      .filter((s): s is CarePlanSummary => s !== null)
      .sort((a, b) => a.client.lastName.localeCompare(b.client.lastName));
  }, [clients, carePlans]);

  function handleAiPlanApply(planData: {
    supportNeedsSummary: string;
    goals: { description: string; targetDate: string; rationale: string }[];
    preferredRoutines: string;
    riskNotes: string;
    communicationStrategies: string;
  }) {
    if (!aiGeneratorClientId) return;
    const plan = carePlans.find((cp) => cp.clientId === aiGeneratorClientId);
    if (!plan) return;

    const newGoals: CarePlanGoal[] = planData.goals.map((g) => ({
      id: generateId(),
      description: g.description,
      targetDate: g.targetDate,
      status: 'Not Started' as const,
    }));

    updateCarePlan(plan.id, {
      supportNeedsSummary: planData.supportNeedsSummary,
      preferredRoutines: planData.preferredRoutines,
      riskNotes: planData.riskNotes,
      communicationNeeds: planData.communicationStrategies,
      goals: [...plan.goals, ...newGoals],
    });

    setAiGeneratorClientId(null);
  }

  if (summaries.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Care Plans</h1>
          <p className="text-sm text-mid-gray mt-1">Manage participant care plans and goals</p>
        </div>
        <EmptyState
          icon={Heart}
          title="No care plans"
          description="No care plans have been created yet. Create one from a client's profile."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Care Plans</h1>
          <p className="text-sm text-mid-gray mt-1">
            {summaries.length} participant{summaries.length !== 1 ? 's' : ''} with care plans
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {summaries.map(({ client, carePlan, goalCounts }) => (
          <div
            key={carePlan.id}
            className="card text-left hover:shadow-md hover:border-sage transition-all group"
          >
            {/* Client info */}
            <div className="flex items-start justify-between mb-4">
              <button
                onClick={() => navigate(`/clients/${client.id}?tab=care-plan`)}
                className="text-left flex-1"
              >
                <h3 className="text-base font-semibold text-charcoal group-hover:text-forest transition-colors">
                  {client.firstName} {client.lastName}
                </h3>
                <p className="text-xs text-mid-gray font-mono mt-0.5">NDIS: {client.ndisNumber}</p>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAiGeneratorClientId(client.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-sage-pale text-mid-gray hover:text-forest transition-colors"
                  title="Generate with AI"
                >
                  <Sparkles size={16} />
                </button>
                <button
                  onClick={() => navigate(`/clients/${client.id}?tab=care-plan`)}
                  className="p-1.5 rounded-lg hover:bg-sage-pale text-mid-gray group-hover:text-forest transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Dates - clickable to navigate */}
            <button
              onClick={() => navigate(`/clients/${client.id}?tab=care-plan`)}
              className="w-full text-left"
            >
            <div className="flex items-center gap-4 mb-4 text-xs text-mid-gray">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} />
                <span>Reviewed: {formatDate(carePlan.lastReviewedDate)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClipboardList size={12} />
                <span>Due: {formatDate(carePlan.nextReviewDueDate)}</span>
              </div>
            </div>

            {/* Goals summary */}
            <div className="pt-4 border-t border-sage-pale">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-forest" />
                <span className="text-sm font-medium text-charcoal">
                  {goalCounts.total} Goal{goalCounts.total !== 1 ? 's' : ''}
                </span>
              </div>

              {goalCounts.total > 0 ? (
                <>
                  {/* Stacked progress bar */}
                  <div className="w-full bg-sage-pale rounded-full h-2 flex overflow-hidden mb-2">
                    {goalCounts.achieved > 0 && (
                      <div
                        className="bg-green-500 h-2"
                        style={{ width: `${(goalCounts.achieved / goalCounts.total) * 100}%` }}
                      />
                    )}
                    {goalCounts.inProgress > 0 && (
                      <div
                        className="bg-amber-400 h-2"
                        style={{ width: `${(goalCounts.inProgress / goalCounts.total) * 100}%` }}
                      />
                    )}
                    {goalCounts.notStarted > 0 && (
                      <div
                        className="bg-gray-300 h-2"
                        style={{ width: `${(goalCounts.notStarted / goalCounts.total) * 100}%` }}
                      />
                    )}
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2">
                    {goalCounts.achieved > 0 && (
                      <StatusBadge status="Achieved" className="text-xs" />
                    )}
                    {goalCounts.inProgress > 0 && (
                      <StatusBadge status="In Progress" className="text-xs" />
                    )}
                    {goalCounts.notStarted > 0 && (
                      <StatusBadge status="Not Started" className="text-xs" />
                    )}
                  </div>

                  <div className="flex gap-3 mt-2 text-xs text-mid-gray">
                    {goalCounts.achieved > 0 && <span>{goalCounts.achieved} achieved</span>}
                    {goalCounts.inProgress > 0 && <span>{goalCounts.inProgress} in progress</span>}
                    {goalCounts.notStarted > 0 && <span>{goalCounts.notStarted} not started</span>}
                  </div>
                </>
              ) : (
                <p className="text-xs text-mid-gray">No goals defined yet</p>
              )}
            </div>
            </button>
          </div>
        ))}
      </div>

      {/* AI Support Plan Generator Slide-over */}
      {aiGeneratorClientId && (
        <AiSupportPlanGenerator
          clientId={aiGeneratorClientId}
          onClose={() => setAiGeneratorClientId(null)}
          onApply={handleAiPlanApply}
        />
      )}
    </div>
  );
}
