/**
 * AI Tally Sync - Forgot Password Page
 * Request password reset email
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../auth.css';

const ForgotPassword = () => {
    const { resetPassword } = useAuth();

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const { error } = await resetPassword(email);

            if (error) {
                setError(error.message);
                return;
            }

            setSuccess(true);
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                            <h1>Check Your Email</h1>
                            <p>
                                We've sent password reset instructions to <strong>{email}</strong>.
                                Please check your inbox and follow the link to reset your password.
                            </p>
                            <div className="success-actions">
                                <Link to="/login" className="btn-auth-primary">
                                    Back to Login
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                            <p className="auth-note">
                                Didn't receive the email? Check your spam folder or{' '}
                                <button onClick={() => setSuccess(false)} className="auth-link-btn">
                                    try again
                                </button>
                            </p>
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
                        <h1>Forgot password?</h1>
                        <p>No worries, we'll send you reset instructions.</p>
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
                                    className="form-input"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError('');
                                    }}
                                    required
                                    autoComplete="email"
                                />
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
                                    Sending...
                                </>
                            ) : (
                                <>
                                    Send Reset Link
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="auth-footer">
                        <Link to="/login" className="back-link">
                            <ArrowLeft size={16} />
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
