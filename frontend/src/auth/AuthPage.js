import { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

// ===== ROSCOE LOGO COMPONENT =====
const RoscoeLogo = ({ size = "large" }) => {
  const dimensions = size === "large" ? { width: "64", height: "64" } : { width: "32", height: "32" };
  return (
    <svg width={dimensions.width} height={dimensions.height} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0ZM50 80C33.4315 80 20 66.5685 20 50C20 33.4315 33.4315 20 50 20V80Z" fill="#34D399"/>
      <path d="M50 20C66.5685 20 80 33.4315 80 50C80 66.5685 66.5685 80 50 80V20Z" fill="#A7F3D0"/>
    </svg>
  );
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isLogin) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
    }

    if (isLogin) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // Keep loading state active - App.js will take over after auth succeeds
        // Fallback timeout if App.js doesn't take over (edge case safety net)
        timeoutRef.current = setTimeout(() => setLoading(false), 10000);
      } catch (err) {
        // Clear timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (err.code === 'auth/invalid-credential') {
            setError('Invalid email or password.');
        } else {
            setError('Failed to log in. Please try again.');
        }
        setLoading(false);
      }
    } else {
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'An unknown error occurred.');
        }
        await signInWithEmailAndPassword(auth, email, password);
        // Keep loading state active - App.js will take over after auth succeeds
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center section-padding" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="container-mobile">
        <div className="card p-6 lg:p-8 mx-auto animate-fade-in" style={{ maxWidth: '420px' }}>
          
          {/* Roscoe Branding */}
          <div className="text-center mb-6 lg:mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <RoscoeLogo size="large" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Roscoe</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Home Helper</p>
              </div>
            </div>
            <h2 className="text-xl lg:text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {isLogin ? 'Welcome Back!' : 'Create Your Account'}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isLogin ? 'Log in to access your smart home assistant.' : 'Join your family\'s home helper.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="animate-slide-up">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Name
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="input-base focus-ring"
                  placeholder="Enter your full name"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="input-base focus-ring"
                placeholder="Enter your email address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="input-base focus-ring"
                placeholder="Enter your password"
              />
              {!isLogin && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Password must be at least 6 characters long.
                </p>
              )}
            </div>
            
            {!isLogin && (
              <div className="animate-slide-up">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Confirm Password
                </label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  className="input-base focus-ring"
                  placeholder="Confirm your password"
                />
              </div>
            )}
            
            {error && (
              <div className="p-4 rounded-lg animate-fade-in" style={{ 
                backgroundColor: 'var(--color-error-light)', 
                borderLeft: '4px solid var(--color-error)',
                color: 'var(--color-error)' 
              }}>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-base btn-primary font-semibold text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span>Signing in</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                  </span>
                </span>
              ) : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
          </form>
          
          <div className="text-center mt-6">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }} 
                className="font-semibold ml-1 hover:underline transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
