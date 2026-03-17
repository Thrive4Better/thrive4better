import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-sage-pale flex items-center justify-center">
          <span className="text-4xl font-bold text-forest">404</span>
        </div>
        <h1 className="text-2xl font-bold text-charcoal mb-2">Page Not Found</h1>
        <p className="text-mid-gray mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="btn-ghost flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
          <Link to="/dashboard" className="btn-primary flex items-center gap-2">
            <Home size={16} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
