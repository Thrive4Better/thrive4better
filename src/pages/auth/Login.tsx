import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
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

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const { signIn, signUp } = useAuth();

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
      setSignUpSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchTab = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setSignUpSuccess(false);
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

          {/* Sign Up Success Message */}
          {signUpSuccess && (
            <div className="mb-6 rounded-xl bg-sage-pale/50 border border-sage-light p-4 text-center">
              <p className="text-forest font-medium">
                Check your email to confirm your account
              </p>
              <p className="text-mid-gray text-sm mt-1">
                We sent a confirmation link to your email address.
              </p>
            </div>
          )}

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
          {!isLogin && !signUpSuccess && (
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
        </div>
      </div>
    </div>
  );
}
