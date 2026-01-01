/**
 * AI Tally Sync - Login Page
 * Email/Password authentication with modern design
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../auth.css';

const Login = () => {
    const navigate = useNavigate();
    const { signIn } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const { error } = await signIn(formData.email, formData.password);

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    setError('Invalid email or password. Please try again.');
                } else if (error.message.includes('Email not confirmed')) {
                    setError('Please verify your email before logging in.');
                } else {
                    setError(error.message);
                }
                return;
            }

            // Success - navigate to dashboard
            navigate('/dashboard');
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-effects">
                <div className="auth-glow auth-glow-1"></div>
                <div className="auth-glow auth-glow-2"></div>
            </div>

            <div className="auth-container">
                <div className="auth-card">
                    {/* Logo */}
                    <Link to="/" className="auth-logo">
                        <div className="logo-icon">
                            <Zap size={24} />
                        </div>
                        <span className="logo-text">BooksNeo</span>
                    </Link>

                    {/* Header */}
                    <div className="auth-header">
                        <h1>Welcome back</h1>
                        <p>Sign in to continue to your dashboard</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="auth-error">
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="input-with-icon">
                                <Mail className="input-icon" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="form-label-row">
                                <label className="form-label">Password</label>
                                <Link to="/forgot-password" className="form-link">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="input-with-icon">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-auth-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="auth-footer">
                        <p>
                            Don't have an account?{' '}
                            <Link to="/register" className="auth-link">
                                Create one now
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Side Info */}
                <div className="auth-side">
                    <div className="auth-side-content">
                        <h2>Automate Your Accounting</h2>
                        <p>
                            AI-powered bank statement processing with seamless Tally Prime integration.
                            Save hours of manual work every week.
                        </p>
                        <ul className="auth-features">
                            <li>✓ AI Transaction Categorization</li>
                            <li>✓ One-Click Tally Sync</li>
                            <li>✓ Multi-Format Import</li>
                            <li>✓ Bank Reconciliation</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
