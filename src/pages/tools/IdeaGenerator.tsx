import { useState, useCallback, useEffect, type KeyboardEvent } from 'react';
import { useStore } from '@/stores/useStore';
import { supabase } from '@/lib/supabase';
import { Sparkles, X, Loader2, MapPin, Car, DollarSign, Users, Plus, RefreshCw, CheckCircle2, Clock, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ──

interface Activity {
  name: string;
  description: string;
  whySuitable: string;
  estimatedCost: string;
  estimatedDuration: string;
  accessibilityNotes: string;
  ndisFundingEligible: boolean;
  suggestedVenues: string[];
}

type BudgetOption = 'free' | 'low' | 'medium' | 'high';
type GroupSizeOption = 'Individual' | 'Small Group (2-4)' | 'Large Group (5+)';

// ── Component ──

export default function IdeaGenerator() {
  const { clients, carePlans } = useStore();

  // Form state
  const [location, setLocation] = useState('');
  const [willingToDrive, setWillingToDrive] = useState(false);
  const [maxDistance, setMaxDistance] = useState(20);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [supportNeeds, setSupportNeeds] = useState('');
  const [budget, setBudget] = useState<BudgetOption>('free');
  const [groupSize, setGroupSize] = useState<GroupSizeOption>('Individual');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [autoFilled, setAutoFilled] = useState(false);

  // Results state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const addInterest = useCallback(() => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests((prev) => [...prev, trimmed]);
    }
    setInterestInput('');
  }, [interestInput, interests]);

  const handleInterestKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInterest();
    }
  };

  const removeInterest = (tag: string) => {
    setInterests((prev) => prev.filter((i) => i !== tag));
  };

  const selectedClient = selectedClientId ? clients.find((c) => c.id === selectedClientId) : null;

  // Auto-fill from participant profile + care plan
  useEffect(() => {
    if (!selectedClient) {
      if (autoFilled) {
        // Clear auto-filled data when deselecting participant
        setLocation('');
        setInterests([]);
        setSupportNeeds('');
        setAutoFilled(false);
      }
      return;
    }

    // Auto-fill location from suburb + postcode
    const parts = [selectedClient.suburb, selectedClient.postcode].filter(Boolean);
    if (parts.length > 0) {
      setLocation(parts.join(', '));
    }

    // Auto-fill from care plan
    const carePlan = carePlans.find((cp) => cp.clientId === selectedClient.id);
    if (carePlan) {
      // Parse likes/preferences into interest tags
      if (carePlan.likesAndPreferences) {
        const parsed = carePlan.likesAndPreferences
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length < 50);
        if (parsed.length > 0) {
          setInterests(parsed);
        }
      }

      // Auto-fill support needs
      if (carePlan.supportNeedsSummary) {
        setSupportNeeds(carePlan.supportNeedsSummary);
      }
    }

    setAutoFilled(true);
  }, [selectedClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!location.trim()) {
      toast.error('Please enter a location');
      return;
    }
    if (interests.length === 0) {
      toast.error('Please add at least one interest');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated. Please log in again.');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/generate-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          location: location.trim(),
          willingToDrive,
          maxDistance: willingToDrive ? maxDistance : undefined,
          interests,
          supportNeeds: supportNeeds.trim() || undefined,
          budget,
          groupSize,
          clientName: selectedClient
            ? `${selectedClient.firstName} ${selectedClient.lastName}`
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate activities');
        setIsLoading(false);
        return;
      }

      setActivities(data.activities || []);
      setHasGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const budgetOptions: { value: BudgetOption; label: string; sub: string }[] = [
    { value: 'free', label: 'Free', sub: '$0' },
    { value: 'low', label: 'Low', sub: '$0-50' },
    { value: 'medium', label: 'Medium', sub: '$50-150' },
    { value: 'high', label: 'High', sub: '$150+' },
  ];

  const groupOptions: GroupSizeOption[] = ['Individual', 'Small Group (2-4)', 'Large Group (5+)'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal flex items-center gap-2">
          <Sparkles size={24} className="text-forest" />
          Activity Idea Generator
        </h1>
        <p className="text-sm text-mid-gray mt-1">
          Generate tailored activity ideas for NDIS participants using AI
        </p>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel - Form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card space-y-5">
            {/* Link to participant - moved to top for auto-fill */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                <UserCircle size={14} className="inline mr-1" />
                Link to Participant <span className="text-mid-gray font-normal">(optional)</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="input-field"
              >
                <option value="">-- None --</option>
                {clients
                  .filter((c) => c.status === 'Active')
                  .sort((a, b) => a.lastName.localeCompare(b.lastName))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
              </select>
              {autoFilled && selectedClient && (
                <p className="text-xs text-forest mt-1.5 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Auto-filled location, interests &amp; support needs from {selectedClient.firstName}'s profile
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                <MapPin size={14} className="inline mr-1" />
                Location / Suburb
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Frankston, VIC"
                className="input-field"
              />
            </div>

            {/* Willing to drive */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <Car size={14} className="text-mid-gray" />
                <span className="text-sm font-medium text-charcoal">Willing to drive?</span>
                <button
                  type="button"
                  onClick={() => setWillingToDrive(!willingToDrive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-auto ${
                    willingToDrive ? 'bg-forest' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      willingToDrive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              {willingToDrive && (
                <div className="mt-3 pl-5">
                  <div className="flex items-center justify-between text-xs text-mid-gray mb-1">
                    <span>5 km</span>
                    <span className="font-medium text-charcoal">{maxDistance} km</span>
                    <span>50 km</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-full accent-forest"
                  />
                </div>
              )}
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Interests
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={handleInterestKeyDown}
                  placeholder="Type and press Enter"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  disabled={!interestInput.trim()}
                  className="p-2.5 rounded-xl bg-sage-pale text-forest hover:bg-sage-light transition-colors disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {interests.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-sage-pale text-forest text-xs font-medium rounded-full"
                    >
                      {tag}
                      <button onClick={() => removeInterest(tag)} className="hover:text-red-500 transition-colors">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Support needs */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Support Needs <span className="text-mid-gray font-normal">(optional)</span>
              </label>
              <textarea
                value={supportNeeds}
                onChange={(e) => setSupportNeeds(e.target.value)}
                placeholder="e.g. Wheelchair accessible, sensory-friendly, 1:1 support..."
                rows={3}
                className="input-field resize-none"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                <DollarSign size={14} className="inline mr-1" />
                Budget
              </label>
              <div className="grid grid-cols-4 gap-2">
                {budgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBudget(opt.value)}
                    className={`py-2 px-2 rounded-xl text-center border transition-colors ${
                      budget === opt.value
                        ? 'border-forest bg-sage-pale text-forest'
                        : 'border-sage-pale text-mid-gray hover:border-sage'
                    }`}
                  >
                    <span className="block text-xs font-medium">{opt.label}</span>
                    <span className="block text-[10px] mt-0.5">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Group size */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                <Users size={14} className="inline mr-1" />
                Group Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {groupOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setGroupSize(opt)}
                    className={`py-2 px-2 rounded-xl text-center border text-xs font-medium transition-colors ${
                      groupSize === opt
                        ? 'border-forest bg-sage-pale text-forest'
                        : 'border-sage-pale text-mid-gray hover:border-sage'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Ideas
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right panel - Results */}
        <div className="lg:col-span-3">
          {/* Empty state */}
          {!hasGenerated && !isLoading && (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <Sparkles size={48} className="text-sage-light mb-4" />
              <h3 className="text-lg font-medium text-charcoal mb-1">
                Generate activity ideas tailored to your participant
              </h3>
              <p className="text-sm text-mid-gray max-w-sm">
                Fill in the details on the left and click "Generate Ideas" to get personalised,
                NDIS-aligned activity suggestions.
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <div className="flex items-center gap-1 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-forest animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-forest animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-forest animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-sm font-medium text-charcoal">Finding great activities...</p>
              <p className="text-xs text-mid-gray mt-1">Considering interests, accessibility, and NDIS eligibility</p>
            </div>
          )}

          {/* Results */}
          {hasGenerated && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-mid-gray">
                  {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} suggested
                </p>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 text-sm font-medium text-forest hover:text-forest-mid transition-colors"
                >
                  <RefreshCw size={14} />
                  Generate More
                </button>
              </div>

              {activities.map((activity, index) => (
                <div
                  key={index}
                  className="card hover:shadow-md hover:border-sage transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-semibold text-charcoal">{activity.name}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {activity.ndisFundingEligible && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <CheckCircle2 size={12} />
                          NDIS Eligible
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-mid-gray mb-3">{activity.description}</p>

                  {/* Why suitable */}
                  <div className="bg-sage-pale/50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-forest mb-1">Why it's great</p>
                    <p className="text-sm text-charcoal">{activity.whySuitable}</p>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cream text-charcoal text-xs font-medium rounded-full border border-sage-pale">
                      <DollarSign size={12} />
                      {activity.estimatedCost}
                    </span>
                    {activity.estimatedDuration && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                        <Clock size={12} />
                        {activity.estimatedDuration}
                      </span>
                    )}
                  </div>

                  {/* Accessibility */}
                  {activity.accessibilityNotes && (
                    <p className="text-xs text-mid-gray mb-3">
                      <span className="font-medium">Accessibility: </span>
                      {activity.accessibilityNotes}
                    </p>
                  )}

                  {/* Suggested venues */}
                  {activity.suggestedVenues && activity.suggestedVenues.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activity.suggestedVenues.map((venue, vi) => (
                        <span
                          key={vi}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-sage-pale text-forest text-xs rounded-full"
                        >
                          <MapPin size={10} />
                          {venue}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Generate More at bottom */}
              {activities.length > 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full py-3 text-sm font-medium text-forest bg-sage-pale rounded-xl hover:bg-sage-light transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  Generate More Ideas
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
