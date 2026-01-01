/**
 * AI Tally Sync - Sidebar Component
 * Navigation sidebar with module links and plan-based feature locks
 */

import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Building2,
    ShoppingCart,
    DollarSign,
    Link2,
    User,
    ChevronLeft,
    Sparkles,
    GitCompare,
    BarChart3,
    Lock,
    Crown,
    X
} from 'lucide-react';
import { FEATURE_ROUTES } from '../../config/plans';

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', feature: null },
    { path: '/banking', icon: Building2, label: 'Banking', feature: null },
    { path: '/reconciliation', icon: GitCompare, label: 'Reconciliation', feature: 'bankReconciliation' },
    { path: '/reports', icon: BarChart3, label: 'Reports', feature: 'reports' },
    { path: '/purchase', icon: ShoppingCart, label: 'Purchase', feature: null },
    { path: '/sales', icon: DollarSign, label: 'Sales', feature: null },
    { path: '/tally', icon: Link2, label: 'Tally Connector', feature: null },
    { path: '/profile', icon: User, label: 'Profile', feature: null }
];

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { state, actions } = useApp();
    const { plan, hasFeatureAccess } = useAuth();
    const { sidebarCollapsed } = state.ui;

    // Check if feature is locked for current plan
    const isFeatureLocked = (feature) => {
        if (!feature) return false;
        return !hasFeatureAccess(feature);
    };

    // Handle nav item click - close sidebar on mobile
    const handleNavClick = (e, locked) => {
        if (locked) {
            e.preventDefault();
            return;
        }
        // Close sidebar on mobile when nav item clicked
        if (window.innerWidth <= 768 && onClose) {
            onClose();
        }
    };

    return (
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}>
            {/* Mobile Close Button */}
            <button
                className="sidebar-close-btn"
                onClick={onClose}
                aria-label="Close menu"
            >
                <X size={18} />
            </button>

            {/* Logo Header */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Sparkles size={20} />
                    </div>
                    {!sidebarCollapsed && (
                        <span className="sidebar-logo-text">BooksNeo</span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navItems.map(({ path, icon: Icon, label, feature }) => {
                    const locked = isFeatureLocked(feature);

                    return (
                        <NavLink
                            key={path}
                            to={locked ? '#' : path}
                            onClick={(e) => handleNavClick(e, locked)}
                            className={({ isActive }) =>
                                `nav-item ${isActive && !locked ? 'active' : ''} ${locked ? 'locked' : ''}`
                            }
                            style={locked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            title={locked ? `Upgrade to access ${label}` : label}
                        >
                            <Icon className="nav-item-icon" size={20} />
                            {!sidebarCollapsed && (
                                <>
                                    <span className="nav-item-text">{label}</span>
                                    {locked && (
                                        <Lock
                                            size={14}
                                            style={{
                                                marginLeft: 'auto',
                                                color: 'var(--warning-500)'
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Plan Badge */}
            {!sidebarCollapsed && plan && (
                <div style={{
                    padding: 'var(--space-3) var(--space-4)',
                    margin: '0 var(--space-3)',
                    background: plan.name === 'Free' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: 'var(--space-2)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: '600',
                        color: plan.name === 'Free' ? 'var(--text-muted)' : 'var(--primary-400)'
                    }}>
                        {plan.name !== 'Free' && <Crown size={12} />}
                        {plan.displayName || plan.name} Plan
                    </div>
                    {plan.name === 'Free' && (
                        <NavLink
                            to="/profile#plans"
                            style={{
                                fontSize: 'var(--text-xs)',
                                color: 'var(--primary-400)',
                                textDecoration: 'none',
                                display: 'block',
                                marginTop: 'var(--space-1)'
                            }}
                        >
                            Upgrade →
                        </NavLink>
                    )}
                </div>
            )}

            {/* Tally Status */}
            <div className="sidebar-footer" style={{ padding: 'var(--space-4)' }}>
                <div
                    className={`connection-status ${state.tally.connected ? 'connected' : 'disconnected'}`}
                    style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                >
                    <span className={`status-dot ${state.tally.connected ? 'connected' : 'disconnected'}`} />
                    {!sidebarCollapsed && (
                        <span>{state.tally.connected ? 'Tally Connected' : 'Tally Offline'}</span>
                    )}
                </div>

                {!sidebarCollapsed && state.tally.activeCompany && (
                    <p style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        marginTop: 'var(--space-2)',
                        marginBottom: 0
                    }}>
                        {state.tally.activeCompany}
                    </p>
                )}
            </div>

            {/* Collapse Toggle */}
            <button
                className="btn btn-ghost btn-icon"
                onClick={actions.toggleSidebar}
                style={{
                    position: 'absolute',
                    right: sidebarCollapsed ? '50%' : 'var(--space-4)',
                    bottom: 'var(--space-4)',
                    transform: sidebarCollapsed ? 'translateX(50%) rotate(180deg)' : 'none'
                }}
            >
                <ChevronLeft size={20} />
            </button>
        </aside>
    );
};

export default Sidebar;
