import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import {
  ClipboardList,
  Target,
  Heart,
  MessageSquare,
  AlertTriangle,
  Stethoscope,
  Calendar,
} from 'lucide-react';

export default function MyCarePlan() {
  const { profile } = useAuth();
  const { carePlans, clients } = useStore();

  const myClientId = profile?.carerId || '';
  const client = useMemo(() => clients.find((c) => c.id === myClientId), [clients, myClientId]);
  const carePlan = useMemo(() => carePlans.find((cp) => cp.clientId === myClientId), [carePlans, myClientId]);

  if (!client) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-mid-gray">Your profile could not be found. Please contact support.</p>
      </div>
    );
  }

  if (!carePlan) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">My Care Plan</h1>
          <p className="text-sm text-mid-gray mt-1">View your care plan details</p>
        </div>
        <div className="card p-8 text-center">
          <ClipboardList size={48} className="mx-auto text-mid-gray mb-3" />
          <p className="text-charcoal font-medium">No Care Plan Yet</p>
          <p className="text-sm text-mid-gray mt-1">
            Your care plan has not been created yet. Please contact your support coordinator.
          </p>
        </div>
      </div>
    );
  }

  const sections = [
    {
      title: 'Support Needs',
      icon: Heart,
      content: carePlan.supportNeedsSummary,
      color: 'text-rose-600 bg-rose-50',
    },
    {
      title: 'Preferred Routines',
      icon: Calendar,
      content: carePlan.preferredRoutines,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Likes & Preferences',
      icon: Heart,
      content: carePlan.likesAndPreferences,
      color: 'text-pink-600 bg-pink-50',
    },
    {
      title: 'Communication Needs',
      icon: MessageSquare,
      content: carePlan.communicationNeeds,
      color: 'text-violet-600 bg-violet-50',
    },
    {
      title: 'Risk Notes',
      icon: AlertTriangle,
      content: carePlan.riskNotes,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      title: 'Medical Information',
      icon: Stethoscope,
      content: carePlan.medicalInfo,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">My Care Plan</h1>
        <p className="text-sm text-mid-gray mt-1">
          Your care plan details. For changes, contact your support coordinator.
        </p>
      </div>

      {/* Review dates */}
      <div className="card p-4 flex flex-wrap gap-4">
        <div>
          <p className="text-xs font-medium text-mid-gray uppercase tracking-wider">Last Reviewed</p>
          <p className="text-sm text-charcoal mt-0.5">
            {carePlan.lastReviewedDate ? formatDate(carePlan.lastReviewedDate) : 'Not yet reviewed'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-mid-gray uppercase tracking-wider">Next Review Due</p>
          <p className="text-sm text-charcoal mt-0.5">
            {carePlan.nextReviewDueDate ? formatDate(carePlan.nextReviewDueDate) : 'Not scheduled'}
          </p>
        </div>
      </div>

      {/* Goals */}
      {carePlan.goals && carePlan.goals.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-sage-pale bg-sage-pale/20 flex items-center gap-2">
            <Target size={18} className="text-forest" />
            <h2 className="font-semibold text-charcoal">My Goals</h2>
          </div>
          <div className="divide-y divide-sage-pale/50">
            {carePlan.goals.map((goal) => (
              <div key={goal.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-charcoal">{goal.description}</p>
                    {goal.targetDate && (
                      <p className="text-xs text-mid-gray mt-1">Target: {formatDate(goal.targetDate)}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                      goal.status === 'Achieved'
                        ? 'bg-green-100 text-green-700'
                        : goal.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {goal.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan sections */}
      {sections.map((section) => {
        if (!section.content) return null;
        const Icon = section.icon;
        return (
          <div key={section.title} className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-sage-pale bg-sage-pale/20 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${section.color}`}>
                <Icon size={16} />
              </div>
              <h2 className="font-semibold text-charcoal">{section.title}</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-charcoal whitespace-pre-wrap leading-relaxed">
                {section.content}
              </p>
            </div>
          </div>
        );
      })}

      {/* Allied Health Contacts */}
      {carePlan.alliedHealthContacts && carePlan.alliedHealthContacts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-sage-pale bg-sage-pale/20 flex items-center gap-2">
            <Stethoscope size={18} className="text-forest" />
            <h2 className="font-semibold text-charcoal">Allied Health Team</h2>
          </div>
          <div className="divide-y divide-sage-pale/50">
            {carePlan.alliedHealthContacts.map((contact) => (
              <div key={contact.id} className="px-5 py-3">
                <p className="text-sm font-medium text-charcoal">{contact.name}</p>
                <p className="text-xs text-mid-gray">{contact.role}</p>
                <div className="flex gap-4 mt-1">
                  {contact.phone && (
                    <p className="text-xs text-mid-gray">{contact.phone}</p>
                  )}
                  {contact.email && (
                    <p className="text-xs text-mid-gray">{contact.email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
