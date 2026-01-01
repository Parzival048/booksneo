/**
 * AI Tally Sync - Header Component
 * Top header with company selector, user info, and logout
 */

import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Bell, Search, ChevronDown, LogOut, Crown, Menu, Sun, Moon } from 'lucide-react';
import { getLedgers } from '../../services/tallyService';

// Page title mapping
const pageTitles = {
    '/dashboard': 'Dashboard',
    '/banking': 'Banking Module',
    '/purchase': 'Purchase Module',
    '/sales': 'Sales Module',
    '/reconciliation': 'Bank Reconciliation',
    '/reports': 'Reports & Analytics',
    '/tally': 'Tally Connector',
    '/settings': 'Settings',
    '/profile': 'Profile'
};

const Header = ({ onMenuToggle }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { state, actions } = useApp();
    const { user, profile, plan, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const pageTitle = pageTitles[location.pathname] || 'BooksNeo';
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Get user display name
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const planName = plan?.displayName || plan?.name || 'Free';

    // Handle company change
    const handleCompanyChange = async (companyName) => {
        actions.setActiveCompany(companyName);
        setIsDropdownOpen(false);

        // Load ledgers for new company
        try {
            const ledgers = await getLedgers(companyName);
            actions.setLedgers(ledgers);
        } catch (error) {
            console.error('Failed to load ledgers:', error);
        }
    };

    // Handle logout
    const handleLogout = async () => {
        setIsLoggingOut(true);
        await signOut();
        navigate('/');
    };

    // Get pending sync count
    const pendingCount = state.banking.transactions.filter(t => !t.syncedToTally).length;

    // Plan badge colors
    const getPlanColor = (planName) => {
        const colors = {
            'Free': 'rgba(100, 116, 139, 0.2)',
            'Starter': 'rgba(245, 158, 11, 0.2)',
            'Professional': 'rgba(99, 102, 241, 0.2)',
            'Enterprise': 'rgba(168, 85, 247, 0.2)'
        };
        return colors[planName] || colors['Free'];
    };

    const getPlanTextColor = (planName) => {
        const colors = {
            'Free': 'var(--text-muted)',
            'Starter': 'var(--warning-500)',
            'Professional': 'var(--primary-400)',
            'Enterprise': '#a855f7'
        };
        return colors[planName] || colors['Free'];
    };

    return (
        <header className="header">
            {/* Page Title */}
            <div className="header-left flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                    className="mobile-menu-btn"
                    onClick={onMenuToggle}
                    aria-label="Toggle menu"
                >
                    <Menu size={20} />
                </button>
                <h1 className="header-title">{pageTitle}</h1>
            </div>

            {/* Actions */}
            <div className="header-actions">
                {/* Company Selector Dropdown */}
                {state.tally.connected && state.tally.companies.length > 0 && (
                    <div
                        className="company-selector"
                        style={{ position: 'relative' }}
                    >
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                padding: 'var(--space-2) var(--space-4)',
                                background: 'var(--bg-glass)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-default)',
                                cursor: 'pointer',
                                minWidth: '120px'
                            }}
                        >
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--success-500)'
                            }} />
                            <span style={{
                                fontSize: 'var(--text-sm)',
                                color: 'var(--text-primary)',
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '150px'
                            }}>
                                {(typeof state.tally.activeCompany === 'string' && state.tally.activeCompany)
                                    ? state.tally.activeCompany
                                    : (state.tally.companies[0]?.name || 'Select Company')}
                            </span>
                            <ChevronDown
                                size={16}
                                style={{
                                    color: 'var(--text-muted)',
                                    transition: 'transform 0.2s',
                                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)'
                                }}
                            />
                        </div>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <>
                                {/* Backdrop to close dropdown */}
                                <div
                                    style={{
                                        position: 'fixed',
                                        inset: 0,
                                        zIndex: 99
                                    }}
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: 'var(--space-2)',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 'var(--radius-lg)',
                                    boxShadow: 'var(--shadow-xl)',
                                    minWidth: '200px',
                                    zIndex: 100,
                                    overflow: 'hidden'
                                }}>
                                    {state.tally.companies.map((company) => (
                                        <div
                                            key={company.name}
                                            onClick={() => handleCompanyChange(company.name)}
                                            style={{
                                                padding: 'var(--space-3) var(--space-4)',
                                                cursor: 'pointer',
                                                background: state.tally.activeCompany === company.name
                                                    ? 'rgba(99, 102, 241, 0.1)'
                                                    : 'transparent',
                                                borderLeft: state.tally.activeCompany === company.name
                                                    ? '3px solid var(--primary-500)'
                                                    : '3px solid transparent',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (state.tally.activeCompany !== company.name) {
                                                    e.currentTarget.style.background = 'var(--bg-glass)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (state.tally.activeCompany !== company.name) {
                                                    e.currentTarget.style.background = 'transparent';
                                                }
                                            }}
                                        >
                                            <div style={{
                                                fontSize: 'var(--text-sm)',
                                                fontWeight: state.tally.activeCompany === company.name ? '600' : '400'
                                            }}>
                                                {company.name}
                                            </div>
                                            {company.from && (
                                                <div style={{
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--text-muted)'
                                                }}>
                                                    From: {company.from}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Pending Sync Badge */}
                {pendingCount > 0 && (
                    <Link to="/banking" style={{ textDecoration: 'none' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-2) var(--space-3)',
                            background: 'rgba(245, 158, 11, 0.2)',
                            borderRadius: 'var(--radius-full)',
                            color: 'var(--warning-500)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: '500'
                        }}>
                            <span>{pendingCount} pending</span>
                        </div>
                    </Link>
                )}

                {/* Theme Toggle */}
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Search */}
                <button className="btn btn-ghost btn-icon" title="Search">
                    <Search size={20} />
                </button>

                {/* Notifications */}
                <button
                    className="btn btn-ghost btn-icon"
                    title="Notifications"
                    style={{ position: 'relative' }}
                >
                    <Bell size={20} />
                    {state.ui.notifications.length > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--error-500)'
                        }} />
                    )}
                </button>

                {/* User Menu */}
                <div style={{ position: 'relative' }}>
                    <div
                        className="user-menu"
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-2) var(--space-3)',
                            background: 'var(--bg-glass)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-default)',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--gradient-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 'var(--text-sm)',
                            fontWeight: '600'
                        }}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{
                                fontSize: 'var(--text-sm)',
                                fontWeight: '500',
                                color: 'var(--text-primary)',
                                maxWidth: '120px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {displayName}
                            </span>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: 'var(--text-xs)',
                                color: getPlanTextColor(planName),
                                fontWeight: '500'
                            }}>
                                {planName !== 'Free' && <Crown size={10} />}
                                {planName}
                            </span>
                        </div>
                        <ChevronDown
                            size={14}
                            style={{
                                color: 'var(--text-muted)',
                                transition: 'transform 0.2s',
                                transform: isUserMenuOpen ? 'rotate(180deg)' : 'rotate(0)'
                            }}
                        />
                    </div>

                    {/* User Dropdown */}
                    {isUserMenuOpen && (
                        <>
                            <div
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 99
                                }}
                                onClick={() => setIsUserMenuOpen(false)}
                            />
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: 'var(--space-2)',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-xl)',
                                minWidth: '200px',
                                zIndex: 100,
                                overflow: 'hidden'
                            }}>
                                {/* User Info */}
                                <div style={{
                                    padding: 'var(--space-4)',
                                    borderBottom: '1px solid var(--border-default)'
                                }}>
                                    <div style={{
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: '600',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {displayName}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--text-muted)'
                                    }}>
                                        {user?.email}
                                    </div>
                                    <div style={{
                                        marginTop: '0.5rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.25rem 0.5rem',
                                        background: getPlanColor(planName),
                                        color: getPlanTextColor(planName),
                                        fontSize: 'var(--text-xs)',
                                        fontWeight: '600',
                                        borderRadius: 'var(--radius-full)'
                                    }}>
                                        {planName !== 'Free' && <Crown size={10} />}
                                        {planName} Plan
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <Link
                                    to="/profile"
                                    onClick={() => setIsUserMenuOpen(false)}
                                    style={{
                                        display: 'block',
                                        padding: 'var(--space-3) var(--space-4)',
                                        color: 'var(--text-secondary)',
                                        fontSize: 'var(--text-sm)',
                                        textDecoration: 'none',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    View Profile
                                </Link>
                                <Link
                                    to="/settings"
                                    onClick={() => setIsUserMenuOpen(false)}
                                    style={{
                                        display: 'block',
                                        padding: 'var(--space-3) var(--space-4)',
                                        color: 'var(--text-secondary)',
                                        fontSize: 'var(--text-sm)',
                                        textDecoration: 'none',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    Settings
                                </Link>

                                {/* Logout */}
                                <button
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                        padding: 'var(--space-3) var(--space-4)',
                                        color: 'var(--error-500)',
                                        fontSize: 'var(--text-sm)',
                                        background: 'transparent',
                                        border: 'none',
                                        borderTop: '1px solid var(--border-default)',
                                        cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                                        opacity: isLoggingOut ? 0.6 : 1,
                                        textAlign: 'left',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={(e) => !isLoggingOut && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <LogOut size={16} />
                                    {isLoggingOut ? 'Signing out...' : 'Sign out'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
