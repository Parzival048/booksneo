/**
 * AI Tally Sync - Profile Page
 * User profile and subscription management with detailed plans
 */

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAllPlans, FEATURE_INFO, formatLimit, formatPrice } from '../config/plans';
import {
    User,
    Mail,
    CreditCard,
    Edit2,
    Save,
    Crown,
    Check,
    X as XIcon,
    Building2,
    Phone,
    Loader2,
    Sparkles,
    Link2,
    Upload,
    FileText,
    GitCompare,
    BarChart3,
    Layers,
    Tag,
    Code,
    Users,
    Headphones,
    UserCheck,
    Zap,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

// Icon mapping for features
const FeatureIcon = ({ name, size = 14 }) => {
    const icons = {
        Sparkles, Link2, Upload, FileText, GitCompare, BarChart3,
        Layers, Tag, Code, Users, Headphones, UserCheck, Building2
    };
    const Icon = icons[name] || Check;
    return <Icon size={size} />;
};

const Profile = () => {
    const { actions } = useApp();
    const { user, profile, plan, usage, getTransactionLimit, getCompanyLimit, updateProfile } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [allPlans, setAllPlans] = useState([]);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [expandedPlan, setExpandedPlan] = useState(null);
    const [formData, setFormData] = useState({
        full_name: profile?.full_name || '',
        company_name: profile?.company_name || '',
        phone: profile?.phone || ''
    });

    // Load all plans
    useEffect(() => {
        setAllPlans(getAllPlans());
    }, []);

    // Update form data when profile changes
    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                company_name: profile.company_name || '',
                phone: profile.phone || ''
            });
        }
    }, [profile]);

    const handleSave = async () => {
        setIsSaving(true);
        const { error } = await updateProfile(formData);
        setIsSaving(false);

        if (!error) {
            setIsEditing(false);
            actions.addNotification({
                type: 'success',
                message: 'Profile updated successfully'
            });
        } else {
            actions.addNotification({
                type: 'error',
                message: 'Failed to update profile'
            });
        }
    };

    const handleCancel = () => {
        setFormData({
            full_name: profile?.full_name || '',
            company_name: profile?.company_name || '',
            phone: profile?.phone || ''
        });
        setIsEditing(false);
    };

    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const currentPlanId = plan?.id || 'free';
    const transactionLimit = getTransactionLimit();
    const companyLimit = getCompanyLimit();

    const getPlanPrice = (planData) => {
        return billingCycle === 'yearly' ? planData.priceYearly : planData.priceMonthly;
    };

    const isCurrentPlan = (planData) => planData.id === currentPlanId;

    const getPlanBadgeStyle = (planId) => {
        const styles = {
            free: { bg: 'rgba(100, 116, 139, 0.2)', color: 'var(--text-muted)' },
            starter: { bg: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning-500)' },
            professional: { bg: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-400)' },
            enterprise: { bg: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }
        };
        return styles[planId] || styles.free;
    };

    const handleSelectPlan = (planData) => {
        if (isCurrentPlan(planData)) return;

        // TODO: Integrate with payment gateway (Razorpay)
        actions.addNotification({
            type: 'info',
            message: `Plan upgrade to ${planData.displayName} coming soon! Contact support for now.`
        });
    };

    // Get top features for a plan (for compact display)
    const getTopFeatures = (planData) => {
        const features = [];

        // Limits
        features.push({
            text: `${formatLimit(planData.limits.transactionsPerMonth)} transactions/month`,
            included: true
        });
        features.push({
            text: `${formatLimit(planData.limits.maxCompanies)} ${planData.limits.maxCompanies === 1 ? 'company' : 'companies'}`,
            included: true
        });

        // Key features
        if (planData.features.aiCategorization) {
            features.push({ text: 'AI Categorization', included: true });
        }
        if (planData.features.tallySync) {
            features.push({ text: 'Tally Sync', included: true });
        }
        if (planData.features.pdfProcessing) {
            features.push({ text: 'PDF Processing', included: true });
        }
        if (planData.features.bankReconciliation) {
            features.push({ text: 'Bank Reconciliation', included: true });
        }
        if (planData.features.reports) {
            features.push({ text: 'Reports & Analytics', included: true });
        }
        if (planData.features.apiAccess) {
            features.push({ text: 'API Access', included: true });
        }
        if (planData.features.prioritySupport) {
            features.push({ text: 'Priority Support', included: true });
        }

        return features.slice(0, 6);
    };

    return (
        <div className="animate-slideUp">
            <div className="mb-6">
                <h2 className="flex items-center gap-2 mb-2">
                    <User size={24} />
                    Profile & Subscription
                </h2>
                <p className="text-secondary" style={{ marginBottom: 0 }}>
                    Manage your account settings and subscription plan
                </p>
            </div>

            <div className="dashboard-grid-2 mb-6">
                {/* Profile Card */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Profile Information</h3>
                        {!isEditing ? (
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 size={16} />
                                Edit
                            </button>
                        ) : (
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={handleCancel}
                            >
                                <XIcon size={16} />
                                Cancel
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: 'var(--radius-xl)',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--text-3xl)',
                            fontWeight: '700',
                            color: 'white'
                        }}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style={{ marginBottom: 'var(--space-1)' }}>{displayName}</h3>
                            <p className="text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                                {user?.email}
                            </p>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.25rem 0.75rem',
                                background: getPlanBadgeStyle(currentPlanId).bg,
                                color: getPlanBadgeStyle(currentPlanId).color,
                                fontSize: 'var(--text-xs)',
                                fontWeight: '600',
                                borderRadius: 'var(--radius-full)'
                            }}>
                                {currentPlanId !== 'free' && <Crown size={12} />}
                                {plan?.displayName || 'Free'} Plan
                            </span>
                        </div>
                    </div>

                    {isEditing ? (
                        <>
                            <div className="form-group">
                                <label className="form-label">
                                    <User size={14} style={{ marginRight: '0.5rem', opacity: 0.5 }} />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Enter your full name"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <Building2 size={14} style={{ marginRight: '0.5rem', opacity: 0.5 }} />
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.company_name}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                    placeholder="Enter your company name"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <Phone size={14} style={{ marginRight: '0.5rem', opacity: 0.5 }} />
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Enter your phone number"
                                />
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            <div className="flex items-center gap-3">
                                <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>{user?.email}</span>
                            </div>
                            {profile?.company_name && (
                                <div className="flex items-center gap-3">
                                    <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>{profile.company_name}</span>
                                </div>
                            )}
                            {profile?.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>{profile.phone}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Current Plan with Usage */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <CreditCard size={18} />
                            Current Subscription
                        </h3>
                    </div>

                    <div
                        style={{
                            padding: 'var(--space-6)',
                            background: currentPlanId === 'free'
                                ? 'var(--bg-glass-strong)'
                                : 'var(--gradient-primary)',
                            borderRadius: 'var(--radius-xl)',
                            marginBottom: 'var(--space-4)'
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            {currentPlanId !== 'free' && <Crown size={20} style={{ color: 'white' }} />}
                            <h3 style={{
                                color: currentPlanId === 'free' ? 'var(--text-primary)' : 'white',
                                marginBottom: 0
                            }}>
                                {plan?.displayName || 'Free'} Plan
                            </h3>
                        </div>
                        <p style={{
                            color: currentPlanId === 'free' ? 'var(--text-secondary)' : 'rgba(255,255,255,0.8)',
                            marginBottom: 'var(--space-4)',
                            fontSize: 'var(--text-sm)'
                        }}>
                            {plan?.description || 'Basic features for personal use'}
                        </p>
                        <div className="flex items-center gap-2">
                            <span style={{
                                fontSize: 'var(--text-2xl)',
                                fontWeight: '700',
                                color: currentPlanId === 'free' ? 'var(--text-primary)' : 'white'
                            }}>
                                {formatPrice(plan?.priceMonthly || 0)}
                            </span>
                            <span style={{
                                color: currentPlanId === 'free' ? 'var(--text-muted)' : 'rgba(255,255,255,0.6)'
                            }}>
                                /month
                            </span>
                        </div>
                    </div>

                    {/* Usage Section */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <h4 style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                            <Zap size={14} style={{ marginRight: '0.5rem', color: 'var(--primary-400)' }} />
                            Your Usage
                        </h4>

                        {/* Transactions */}
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Transactions</span>
                                <span style={{ fontWeight: '600' }}>
                                    {transactionLimit.unlimited ? 'Unlimited' : `${transactionLimit.usage} / ${transactionLimit.displayLimit}`}
                                </span>
                            </div>
                            <div style={{
                                height: '6px',
                                background: 'var(--bg-glass)',
                                borderRadius: 'var(--radius-full)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: transactionLimit.unlimited ? '0%' : `${transactionLimit.percentage}%`,
                                    height: '100%',
                                    background: transactionLimit.percentage > 80 ? 'var(--warning-500)' : 'var(--primary-500)',
                                    transition: 'width 0.3s'
                                }} />
                            </div>
                        </div>

                        {/* Companies */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Companies</span>
                                <span style={{ fontWeight: '600' }}>
                                    {companyLimit.unlimited ? 'Unlimited' : `${companyLimit.usage} / ${companyLimit.displayLimit}`}
                                </span>
                            </div>
                            <div style={{
                                height: '6px',
                                background: 'var(--bg-glass)',
                                borderRadius: 'var(--radius-full)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: companyLimit.unlimited ? '0%' : `${companyLimit.percentage}%`,
                                    height: '100%',
                                    background: companyLimit.percentage > 80 ? 'var(--warning-500)' : 'var(--success-500)',
                                    transition: 'width 0.3s'
                                }} />
                            </div>
                        </div>
                    </div>

                    {currentPlanId === 'free' && (
                        <a href="#plans" className="btn btn-primary w-full">
                            <Crown size={18} />
                            Upgrade Now
                        </a>
                    )}
                </div>
            </div>

            {/* Available Plans */}
            <div className="card" id="plans">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <h3 className="card-title">Choose Your Plan</h3>
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        background: 'var(--bg-glass)',
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-full)'
                    }}>
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            style={{
                                padding: '0.5rem 1rem',
                                background: billingCycle === 'monthly' ? 'var(--gradient-primary)' : 'transparent',
                                color: billingCycle === 'monthly' ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: 'var(--radius-full)',
                                cursor: 'pointer',
                                fontSize: 'var(--text-sm)',
                                fontWeight: '500'
                            }}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            style={{
                                padding: '0.5rem 1rem',
                                background: billingCycle === 'yearly' ? 'var(--gradient-primary)' : 'transparent',
                                color: billingCycle === 'yearly' ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: 'var(--radius-full)',
                                cursor: 'pointer',
                                fontSize: 'var(--text-sm)',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            Yearly
                            <span style={{
                                padding: '0.125rem 0.5rem',
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: 'var(--success-500)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: '600',
                                borderRadius: 'var(--radius-full)'
                            }}>
                                Save 17%
                            </span>
                        </button>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 'var(--space-4)'
                }}>
                    {allPlans.map((planData) => {
                        const isExpanded = expandedPlan === planData.id;
                        const topFeatures = getTopFeatures(planData);

                        return (
                            <div
                                key={planData.id}
                                style={{
                                    padding: 'var(--space-5)',
                                    background: isCurrentPlan(planData) ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-glass)',
                                    border: isCurrentPlan(planData)
                                        ? '2px solid var(--primary-500)'
                                        : planData.popular
                                            ? '2px solid var(--primary-400)'
                                            : '1px solid var(--border-default)',
                                    borderRadius: 'var(--radius-xl)',
                                    position: 'relative',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {planData.popular && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-0.75rem',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        padding: '0.25rem 0.75rem',
                                        background: 'var(--gradient-primary)',
                                        color: 'white',
                                        fontSize: 'var(--text-xs)',
                                        fontWeight: '600',
                                        borderRadius: 'var(--radius-full)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Most Popular
                                    </div>
                                )}

                                {/* Plan Header */}
                                <div style={{ marginBottom: 'var(--space-3)' }}>
                                    <h4 style={{ marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {planData.id !== 'free' && <Crown size={16} style={{ color: getPlanBadgeStyle(planData.id).color }} />}
                                        {planData.displayName}
                                    </h4>
                                    <p style={{
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--text-muted)',
                                        marginBottom: 0
                                    }}>
                                        {planData.tagline}
                                    </p>
                                </div>

                                {/* Price */}
                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                    <span style={{
                                        fontSize: 'var(--text-3xl)',
                                        fontWeight: '700'
                                    }}>
                                        {formatPrice(getPlanPrice(planData))}
                                    </span>
                                    {planData.priceMonthly > 0 && (
                                        <span style={{
                                            fontSize: 'var(--text-sm)',
                                            color: 'var(--text-muted)'
                                        }}>
                                            /{billingCycle === 'yearly' ? 'year' : 'month'}
                                        </span>
                                    )}
                                    {billingCycle === 'yearly' && planData.savings && (
                                        <div style={{
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--success-500)',
                                            marginTop: '0.25rem'
                                        }}>
                                            Save {planData.savings}
                                        </div>
                                    )}
                                </div>

                                {/* Features List */}
                                <ul style={{ listStyle: 'none', marginBottom: 'var(--space-4)' }}>
                                    {topFeatures.map((feature, i) => (
                                        <li key={i} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            fontSize: 'var(--text-sm)',
                                            color: 'var(--text-secondary)',
                                            marginBottom: 'var(--space-2)'
                                        }}>
                                            <Check size={14} style={{ color: 'var(--success-500)', flexShrink: 0 }} />
                                            {feature.text}
                                        </li>
                                    ))}
                                </ul>

                                {/* Expand/Collapse for more features */}
                                <button
                                    onClick={() => setExpandedPlan(isExpanded ? null : planData.id)}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-2)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--primary-400)',
                                        fontSize: 'var(--text-xs)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        marginBottom: 'var(--space-3)'
                                    }}
                                >
                                    {isExpanded ? (
                                        <>Show Less <ChevronUp size={14} /></>
                                    ) : (
                                        <>View All Features <ChevronDown size={14} /></>
                                    )}
                                </button>

                                {/* Expanded Features */}
                                {isExpanded && (
                                    <div style={{
                                        padding: 'var(--space-3)',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-lg)',
                                        marginBottom: 'var(--space-3)'
                                    }}>
                                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
                                            Limits
                                        </div>
                                        <ul style={{ listStyle: 'none', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>
                                            <li style={{ marginBottom: '0.25rem' }}>Transactions: {formatLimit(planData.limits.transactionsPerMonth)}/mo</li>
                                            <li style={{ marginBottom: '0.25rem' }}>Companies: {formatLimit(planData.limits.maxCompanies)}</li>
                                            <li style={{ marginBottom: '0.25rem' }}>Ledgers: {formatLimit(planData.limits.maxLedgers)}</li>
                                            <li>Storage: {formatLimit(planData.limits.maxStorageMB)} MB</li>
                                        </ul>

                                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
                                            All Features
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: 'var(--text-xs)' }}>
                                            {Object.entries(planData.features).map(([key, value]) => (
                                                <div key={key} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    opacity: value ? 1 : 0.4
                                                }}>
                                                    {value ? (
                                                        <Check size={10} style={{ color: 'var(--success-500)' }} />
                                                    ) : (
                                                        <XIcon size={10} style={{ color: 'var(--text-muted)' }} />
                                                    )}
                                                    <span style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {FEATURE_INFO[key]?.name || key}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    className={`btn w-full ${isCurrentPlan(planData) ? 'btn-secondary' : 'btn-primary'}`}
                                    disabled={isCurrentPlan(planData)}
                                    onClick={() => handleSelectPlan(planData)}
                                >
                                    {isCurrentPlan(planData) ? 'Current Plan' : 'Select Plan'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Profile;
