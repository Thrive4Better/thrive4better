import { Link } from 'react-router-dom';
import { Brain, ArrowRight } from 'lucide-react';

export default function SupportPlanInfo() {
  return (
    <div className="max-w-2xl mx-auto mt-16 text-center">
      <div className="w-16 h-16 bg-sage-pale rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Brain size={32} className="text-forest" />
      </div>
      <h1 className="text-2xl font-semibold text-charcoal mb-3">AI Support Plan Generator</h1>
      <p className="text-mid-gray text-base mb-8 max-w-md mx-auto">
        To generate an AI support plan, navigate to a client's Care Plan and click{' '}
        <span className="font-medium text-charcoal">'Generate with AI'</span>.
      </p>
      <Link
        to="/clients/care-plans"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-lg text-sm font-medium hover:bg-forest-dark transition-colors"
      >
        Go to Care Plans
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
