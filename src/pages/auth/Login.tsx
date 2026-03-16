import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

const OTP_LENGTH = 6;

function OtpInput({ onComplete, disabled }: { onComplete: (code: string) => void; disabled: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newDigits.join('');
    if (code.length === OTP_LENGTH) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === OTP_LENGTH) {
      onComplete(pasted);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-sage-pale bg-sage-pale/20 text-forest focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent transition disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, verifyOtp, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await signIn(data.email, data.password);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    try {
      await signUp(data.email, data.password, data.fullName);
      setSignUpEmail(data.email);
      setSignUpSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setIsVerifying(true);
    try {
      await verifyOtp(signUpEmail, code);
      toast.success('Email verified! You are now signed in.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid verification code';
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const switchTab = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setSignUpSuccess(false);
    setSignUpEmail('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    loginForm.reset();
    signUpForm.reset();
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo Area */}
        <div className="bg-forest rounded-t-2xl px-8 py-10 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Thrive 4 Better
          </h1>
          <p className="text-sage-light mt-2 text-sm font-medium uppercase tracking-widest">
            NDIS Support Services
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-b-2xl border border-sage-pale shadow-lg px-8 py-8">
          {/* OTP Verification Screen */}
          {signUpSuccess ? (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-sage-pale/50 flex items-center justify-center mb-4">
                <ShieldCheck className="h-7 w-7 text-forest" />
              </div>
              <h2 className="text-lg font-bold text-charcoal mb-1">Check your email</h2>
              <p className="text-mid-gray text-sm mb-1">
                We sent a 6-digit code to
              </p>
              <p className="text-forest font-semibold text-sm mb-6">
                {signUpEmail}
              </p>

              <OtpInput onComplete={handleVerifyOtp} disabled={isVerifying} />

              {isVerifying && (
                <div className="mt-4 flex items-center justify-center gap-2 text-mid-gray text-sm">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </div>
              )}

              <p className="text-mid-gray text-xs mt-6">
                Didn't receive the email? Check your spam folder.
              </p>

              <button
                type="button"
                onClick={() => switchTab(true)}
                className="mt-4 text-sm text-forest font-medium hover:underline"
              >
                Back to login
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex mb-8 border border-sage-pale rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => switchTab(true)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    isLogin
                      ? 'bg-forest text-white'
                      : 'bg-sage-pale/30 text-mid-gray hover:bg-sage-pale/50'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => switchTab(false)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    !isLogin
                      ? 'bg-forest text-white'
                      : 'bg-sage-pale/30 text-mid-gray hover:bg-sage-pale/50'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Login Form */}
              {isLogin && (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                  <div>
                    <label htmlFor="login-email" className="block text-sm font-medium text-charcoal mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-mid-gray" />
                      <input
                        id="login-email"
                        type="email"
                        {...loginForm.register('email')}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-sage-pale bg-sage-pale/20 text-charcoal placeholder:text-mid-gray/60 focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent transition"
                        placeholder="you@example.com"
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="mt-1.5 text-sm text-burgundy">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block text-sm font-medium text-charcoal mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-mid-gray" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        {...loginForm.register('password')}
                        className="w-full pl-11 pr-12 py-3 rounded-xl border border-sage-pale bg-sage-pale/20 text-charcoal placeholder:text-mid-gray/60 focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent transition"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-mid-gray hover:text-charcoal transition"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="mt-1.5 text-sm text-burgundy">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-forest text-white font-semibold hover:bg-forest-mid focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              )}

              {/* Sign Up Form */}
              {!isLogin && (
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-5">
                  <div>
                    <label htmlFor="signup-name" className="block text-sm font-medium text-charcoal mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-mid-gray" />
                      <input
                        id="signup-name"
                        type="text"
                        {...signUpForm.register('fullName')}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-sage-pale bg-sage-pale/20 text-charcoal placeholder:text-mid-gray/60 focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent transition"
                        placeholder="Jane Smith"
                      />
                    </div>
                    {signUpForm.formState.errors.fullName && (
                      <p className="mt-1.5 text-sm text-burgundy">
                        {signUpForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-medium text-charcoal mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-mid-gray" />
                      <input
                        id="signup-email"
                        type="email"
                        {...signUpForm.register('email')}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-sage-pale bg-sage-pale/20 text-charcoal placeholder:text-mid-gray/60 focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent transition"
                        placeholder="you@example.com"
                      />
                    </div>
                    {signUpForm.formState.errors.email && (
                      <p className="mt-1.5 text-sm text-burgundy">
                        {signUpForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-sm font-medium text-charcoal mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-mid-gray" />
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        {...signUpForm.register('password')}
                        className="w-full pl-11 pr-12 py-3 rounded-xl border border-sage-pale bg-sage-pale/20 text-charcoal placeholder:text-mid-gray/60 focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent transition"
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-mid-gray hover:text-charcoal transition"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {signUpForm.formState.errors.password && (
                      <p className="mt-1.5 text-sm text-burgundy">
                        {signUpForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="signup-confirm" className="block text-sm font-medium text-charcoal mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-mid-gray" />
                      <input
                        id="signup-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...signUpForm.register('confirmPassword')}
                        className="w-full pl-11 pr-12 py-3 rounded-xl border border-sage-pale bg-sage-pale/20 text-charcoal placeholder:text-mid-gray/60 focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent transition"
                        placeholder="Re-enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-mid-gray hover:text-charcoal transition"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {signUpForm.formState.errors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-burgundy">
                        {signUpForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-forest text-white font-semibold hover:bg-forest-mid focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
