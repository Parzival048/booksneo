/**
 * AI Tally Sync - Plan Gate Component
 * Restricts features based on user's plan
 */

import { Link } from 'react-router-dom';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * PlanGate - Wraps features that require specific plan access
 * 
 * @param {string} feature - The feature to check ('ai_categorization', 'pdf_processing', 'bank_reconciliation', 'reports', 'tally_sync')
 * @param {React.ReactNode} children - Content to show if user has access
 * @param {string} fallbackMessage - Optional custom message to show if access denied
 * @param {boolean} showUpgrade - Whether to show upgrade button (default: true)
 * @param {'inline' | 'overlay' | 'replace'} mode - How to display the gate (default: 'replace')
 */
const PlanGate = ({
    feature,
    children,
    fallbackMessage,
    showUpgrade = true,
    mode = 'replace',
    requiredPlan = 'Professional'
}) => {
    const { hasFeatureAccess, plan } = useAuth();

    // Check if user has access
    const hasAccess = hasFeatureAccess(feature);

    // If user has access, render children
    if (hasAccess) {
        return children;
    }

    // Feature display names
    const featureNames = {
        'ai_categorization': 'AI Categorization',
        'pdf_processing': 'PDF Processing',
        'bank_reconciliation': 'Bank Reconciliation',
        'reports': 'Reports & Analytics',
        'tally_sync': 'Tally Sync'
    };

    const featureName = featureNames[feature] || feature;
    const message = fallbackMessage || `${featureName} is available on ${requiredPlan} plan and above.`;

    // Inline mode - small badge/indicator
    if (mode === 'inline') {
        return (
            <div className="plan-gate-inline">
                <Lock size={14} />
                <span>{requiredPlan}+</span>
                <style>{`
                    .plan-gate-inline {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.25rem;
                        padding: 0.25rem 0.5rem;
                        background: rgba(99, 102, 241, 0.1);
                        color: var(--primary-400);
                        font-size: 0.75rem;
                        font-weight: 500;
                        border-radius: var(--radius-full);
                    }
                `}</style>
            </div>
        );
    }

    // Overlay mode - shows children dimmed with overlay
    if (mode === 'overlay') {
        return (
            <div className="plan-gate-overlay-container">
                <div className="plan-gate-content-dimmed">
                    {children}
                </div>
                <div className="plan-gate-overlay">
                    <div className="plan-gate-message">
                        <div className="plan-gate-icon">
                            <Crown size={24} />
                        </div>
                        <h4>Upgrade Required</h4>
                        <p>{message}</p>
                        {showUpgrade && (
                            <Link to="/profile" className="plan-gate-upgrade-btn">
                                Upgrade Now
                                <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                </div>
                <style>{`
                    .plan-gate-overlay-container {
                        position: relative;
                    }
                    .plan-gate-content-dimmed {
                        opacity: 0.3;
                        pointer-events: none;
                        filter: blur(2px);
                    }
                    .plan-gate-overlay {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(15, 23, 42, 0.6);
                        backdrop-filter: blur(4px);
                        border-radius: var(--radius-xl);
                    }
                    .plan-gate-message {
                        text-align: center;
                        padding: 2rem;
                        max-width: 300px;
                    }
                    .plan-gate-icon {
                        width: 56px;
                        height: 56px;
                        margin: 0 auto 1rem;
                        background: rgba(99, 102, 241, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--primary-400);
                    }
                    .plan-gate-message h4 {
                        font-size: 1.125rem;
                        margin-bottom: 0.5rem;
                        color: var(--text-primary);
                    }
                    .plan-gate-message p {
                        font-size: 0.875rem;
                        color: var(--text-secondary);
                        margin-bottom: 1.5rem;
                    }
                    .plan-gate-upgrade-btn {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.75rem 1.5rem;
                        background: var(--gradient-primary);
                        color: white;
                        font-weight: 600;
                        border-radius: var(--radius-lg);
                        text-decoration: none;
                        transition: all 0.2s;
                    }
                    .plan-gate-upgrade-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: var(--shadow-glow);
                    }
                `}</style>
            </div>
        );
    }

    // Replace mode (default) - completely replaces content
    return (
        <div className="plan-gate-replace">
            <div className="plan-gate-card">
                <div className="plan-gate-icon">
                    <Crown size={32} />
                </div>
                <h3>Upgrade to Unlock</h3>
                <p>{message}</p>
                <div className="plan-gate-current">
                    Your current plan: <strong>{plan?.display_name || 'Free'}</strong>
                </div>
                {showUpgrade && (
                    <Link to="/profile" className="plan-gate-upgrade-btn">
                        View Plans & Upgrade
                        <ArrowRight size={18} />
                    </Link>
                )}
            </div>
            <style>{`
                .plan-gate-replace {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    padding: 2rem;
                }
                .plan-gate-card {
                    text-align: center;
                    padding: 3rem;
                    background: var(--gradient-card);
                    border: 1px solid var(--border-default);
                    border-radius: var(--radius-xl);
                    max-width: 450px;
                }
                .plan-gate-card .plan-gate-icon {
                    width: 72px;
                    height: 72px;
                    margin: 0 auto 1.5rem;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary-400);
                }
                .plan-gate-card h3 {
                    font-size: 1.5rem;
                    margin-bottom: 0.75rem;
                    color: var(--text-primary);
                }
                .plan-gate-card p {
                    font-size: 1rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }
                .plan-gate-current {
                    font-size: 0.875rem;
                    color: var(--text-muted);
                    margin-bottom: 1.5rem;
                }
                .plan-gate-current strong {
                    color: var(--text-secondary);
                }
                .plan-gate-card .plan-gate-upgrade-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem 2rem;
                    background: var(--gradient-primary);
                    color: white;
                    font-size: 1rem;
                    font-weight: 600;
                    border-radius: var(--radius-lg);
                    text-decoration: none;
                    transition: all 0.2s;
                }
                .plan-gate-card .plan-gate-upgrade-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-glow);
                }
            `}</style>
        </div>
    );
};

export default PlanGate;
