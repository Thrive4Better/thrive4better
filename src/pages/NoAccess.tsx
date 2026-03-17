import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function NoAccess() {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <ShieldOff size={32} className="text-red-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-charcoal">Access Restricted</h1>
          <p className="text-sm text-mid-gray mt-2 leading-relaxed">
            You don't have permission to access this feature.
            {role === 'guest' && (
              <> Your account has not yet been granted any access permissions.</>
            )}
          </p>
        </div>

        <div className="card p-5 text-left space-y-3">
          <p className="text-sm font-medium text-charcoal">What can you do?</p>
          <ul className="text-sm text-mid-gray space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-forest mt-1.5 flex-shrink-0" />
              Contact your administrator to request access to this feature
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-forest mt-1.5 flex-shrink-0" />
              If you believe this is an error, reach out to your team lead or manager
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary w-full justify-center flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Go to Dashboard
          </button>
          <button
            onClick={() => signOut()}
            className="btn-ghost w-full justify-center text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
