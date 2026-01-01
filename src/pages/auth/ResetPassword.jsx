/**
 * AI Tally Sync - Reset Password Page
 * Set new password after clicking reset link
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import '../../auth.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { updatePassword } = useAuth();

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(null);

    // Check for valid auth session (user must be logged in to reset password)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is logged in - valid session for password reset
                setIsValidSession(true);
            } else {
                // No user - check if coming from email link
                // Firebase handles password reset via email action links differently
                // For now, allow the page to load - the actual reset will fail if not valid
                setIsValidSession(true);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const validateForm = () => {
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const { error } = await updatePassword(formData.password);

            if (error) {
                setError(error.message);
                return;
            }

            setSuccess(true);

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state
    if (isValidSession === null) {
        return (
            <div className="auth-page">
                <div className="auth-bg-effects">
                    <div className="auth-glow auth-glow-1"></div>
                    <div className="auth-glow auth-glow-2"></div>
                </div>
                <div className="auth-container auth-container-centered">
                    <div className="auth-card">
                        <div className="auth-loading">
                            <Loader2 className="animate-spin" size={32} />
                            <p>Verifying reset link...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Invalid session state
    if (isValidSession === false) {
        return (
            <div className="auth-page">
                <div className="auth-bg-effects">
                    <div className="auth-glow auth-glow-1"></div>
                    <div className="auth-glow auth-glow-2"></div>
                </div>
                <div className="auth-container auth-container-centered">
                    <div className="auth-card">
                        <div className="auth-error-state">
                            <div className="error-icon">
                                <AlertCircle size={48} />
                            </div>
                            <h1>Invalid Reset Link</h1>
                            <p>
                                This password reset link is invalid or has expired.
                                Please request a new password reset link.
                            </p>
                            <div className="error-actions">
                                <Link to="/forgot-password" className="btn-auth-primary">
                                    Request New Link
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-bg-effects">
                    <div className="auth-glow auth-glow-1"></div>
                    <div className="auth-glow auth-glow-2"></div>
                </div>
                <div className="auth-container auth-container-centered">
                    <div className="auth-card">
                        <div className="auth-success">
                            <div className="success-icon">
                                <CheckCircle size={48} />
                            </div>
                            <h1>Password Reset Successfully</h1>
                            <p>
                                Your password has been updated. You'll be redirected to your dashboard shortly.
                            </p>
                            <div className="success-actions">
                                <Link to="/dashboard" className="btn-auth-primary">
                                    Go to Dashboard
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-bg-effects">
                <div className="auth-glow auth-glow-1"></div>
                <div className="auth-glow auth-glow-2"></div>
            </div>

            <div className="auth-container auth-container-centered">
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
                        <h1>Set New Password</h1>
                        <p>Please enter your new password below.</p>
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
                            <label className="form-label">New Password</label>
                            <div className="input-with-icon">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className="form-input"
                                    placeholder="At least 6 characters"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
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

                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <div className="input-with-icon">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    className="form-input"
                                    placeholder="Confirm your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                                    Updating Password...
                                </>
                            ) : (
                                <>
                                    Reset Password
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
