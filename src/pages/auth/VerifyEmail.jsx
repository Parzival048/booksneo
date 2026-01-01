/**
 * BooksNeo - Email Verification Page
 * Shows verification pending status and allows resending verification email
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, RefreshCw, CheckCircle, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../auth.css';

const VerifyEmail = () => {
    const { user, isEmailVerified, resendVerificationEmail, refreshEmailVerification, signOut } = useAuth();
    const navigate = useNavigate();

    const [isResending, setIsResending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [resendError, setResendError] = useState('');
    const [cooldown, setCooldown] = useState(0);

    // Redirect if already verified
    useEffect(() => {
        if (isEmailVerified) {
            navigate('/dashboard');
        }
    }, [isEmailVerified, navigate]);

    // Cooldown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    // Auto-check verification status every 5 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            const verified = await refreshEmailVerification();
            if (verified) {
                navigate('/dashboard');
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [refreshEmailVerification, navigate]);

    const handleResend = async () => {
        if (cooldown > 0) return;

        setIsResending(true);
        setResendError('');
        setResendSuccess(false);

        try {
            const { error } = await resendVerificationEmail();

            if (error) {
                if (error.code === 'auth/too-many-requests') {
                    setResendError('Too many requests. Please wait a few minutes before trying again.');
                } else {
                    setResendError(error.message || 'Failed to send verification email.');
                }
                return;
            }

            setResendSuccess(true);
            setCooldown(60); // 60 second cooldown
        } catch (err) {
            setResendError('An unexpected error occurred. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    const handleCheckVerification = async () => {
        setIsChecking(true);
        try {
            const verified = await refreshEmailVerification();
            if (verified) {
                navigate('/dashboard');
            }
        } finally {
            setIsChecking(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

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
                        <div className="verify-icon">
                            <Mail size={48} />
                        </div>
                        <h1>Verify Your Email</h1>
                        <p>
                            We've sent a verification link to{' '}
                            <strong>{user?.email || 'your email'}</strong>
                        </p>
                    </div>

                    {/* Status Messages */}
                    {resendSuccess && (
                        <div className="auth-success-message">
                            <CheckCircle size={18} />
                            <span>Verification email sent! Please check your inbox.</span>
                        </div>
                    )}

                    {resendError && (
                        <div className="auth-error">
                            <span>{resendError}</span>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="verify-instructions">
                        <div className="instruction-step">
                            <span className="step-number">1</span>
                            <span>Check your email inbox (and spam folder)</span>
                        </div>
                        <div className="instruction-step">
                            <span className="step-number">2</span>
                            <span>Click the verification link in the email</span>
                        </div>
                        <div className="instruction-step">
                            <span className="step-number">3</span>
                            <span>Return here and click "I've Verified" below</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="verify-actions">
                        <button
                            className="btn-auth-primary"
                            onClick={handleCheckVerification}
                            disabled={isChecking}
                        >
                            {isChecking ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    I've Verified My Email
                                </>
                            )}
                        </button>

                        <button
                            className="btn-auth-secondary"
                            onClick={handleResend}
                            disabled={isResending || cooldown > 0}
                        >
                            {isResending ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Sending...
                                </>
                            ) : cooldown > 0 ? (
                                <>
                                    <RefreshCw size={18} />
                                    Resend in {cooldown}s
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={18} />
                                    Resend Verification Email
                                </>
                            )}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="auth-footer">
                        <p className="auth-note">
                            Wrong email?{' '}
                            <button onClick={handleSignOut} className="auth-link-btn">
                                Sign out
                            </button>{' '}
                            and register again.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
