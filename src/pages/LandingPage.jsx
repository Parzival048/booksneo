/**
 * BooksNeo - Professional Landing Page
 * Features hero, features grid, pricing, and CTA sections
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Zap,
    Brain,
    RefreshCcw,
    FileSpreadsheet,
    Shield,
    BarChart3,
    Check,
    ArrowRight,
    Sparkles,
    Building2,
    Upload,
    FileText,
    ChevronRight,
    Star,
    Users,
    Clock,
    TrendingUp,
    X as XIcon,
    Crown,
    Sun,
    Moon,
    Download,
    Monitor,
    Play
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getAllPlans, formatPrice, formatLimit } from '../config/plans';
import Loader from '../components/common/Loader';
import '../landing.css';

const LandingPage = () => {
    const { isAuthenticated } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        // Redirect if already authenticated
        if (isAuthenticated) {
            navigate('/dashboard');
            return;
        }

        // Load plans from centralized config
        setPlans(getAllPlans());

        // Handle scroll for navbar
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isAuthenticated, navigate]);

    // Loader timing - show loader for a premium feel
    useEffect(() => {
        // Wait for images and content to load
        const minLoadTime = 2200; // Minimum loader display time (2.2s for premium feel)
        const startTime = Date.now();

        const handleLoad = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minLoadTime - elapsed);

            setTimeout(() => {
                setIsLoading(false);
            }, remaining);
        };

        // If page is already loaded, just use minimum time
        if (document.readyState === 'complete') {
            setTimeout(() => setIsLoading(false), minLoadTime);
        } else {
            window.addEventListener('load', handleLoad);
            // Fallback in case load event doesn't fire
            setTimeout(() => setIsLoading(false), 3000);
        }

        return () => window.removeEventListener('load', handleLoad);
    }, []);

    const features = [
        {
            icon: <Brain className="feature-icon-svg" />,
            title: 'AI-Powered Categorization',
            description: 'Automatically categorize transactions using advanced GPT-4o-mini AI with smart learning from your corrections.'
        },
        {
            icon: <RefreshCcw className="feature-icon-svg" />,
            title: 'Tally Prime Sync',
            description: 'Seamlessly sync your data with Tally Prime. Push vouchers, fetch ledgers, and manage companies in real-time.'
        },
        {
            icon: <FileSpreadsheet className="feature-icon-svg" />,
            title: 'Multi-Format Import',
            description: 'Import bank statements from CSV, Excel, and PDF files with support for 14+ bank statement formats.'
        },
        {
            icon: <BarChart3 className="feature-icon-svg" />,
            title: 'Bank Reconciliation',
            description: 'Automatic matching of bank transactions with Tally entries. Generate BRS reports effortlessly.'
        },
        {
            icon: <Shield className="feature-icon-svg" />,
            title: 'Secure & Private',
            description: 'Your data is encrypted and secured. Row-level security ensures only you can access your information.'
        },
        {
            icon: <TrendingUp className="feature-icon-svg" />,
            title: 'Insightful Reports',
            description: 'Visual dashboards with cash flow trends, category breakdowns, and actionable financial insights.'
        }
    ];

    const stats = [
        { value: '50K+', label: 'Transactions Processed' },
        { value: '99.9%', label: 'Accuracy Rate' },
        { value: '10x', label: 'Faster Processing' },
        { value: '24/7', label: 'Cloud Access' }
    ];

    const testimonials = [
        {
            quote: "BooksNeo has completely transformed how we handle bank statement processing. What used to take hours now takes minutes.",
            author: "Rajesh Kumar",
            role: "CA, Kumar & Associates",
            rating: 5
        },
        {
            quote: "The AI categorization is incredibly accurate. It learns from our corrections and gets better every day.",
            author: "Priya Sharma",
            role: "Finance Manager, TechStart Pvt Ltd",
            rating: 5
        },
        {
            quote: "Seamless Tally integration. Our voucher entry time has reduced by 80%. Highly recommended!",
            author: "Amit Patel",
            role: "CFO, Patel Industries",
            rating: 5
        }
    ];

    const getPlanPrice = (plan) => {
        return billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    };

    // Get top features for landing page display
    const getPlanFeatures = (plan) => {
        const features = [];
        features.push(`${formatLimit(plan.limits.transactionsPerMonth)} transactions/mo`);
        features.push(`${formatLimit(plan.limits.maxCompanies)} ${plan.limits.maxCompanies === 1 ? 'company' : 'companies'}`);
        if (plan.features.aiCategorization) features.push('AI Categorization');
        if (plan.features.tallySync) features.push('Tally Sync');
        if (plan.features.pdfProcessing) features.push('PDF Processing');
        if (plan.features.bankReconciliation) features.push('Bank Reconciliation');
        if (plan.features.reports) features.push('Reports & Analytics');
        if (plan.features.prioritySupport) features.push('Priority Support');
        if (plan.features.apiAccess) features.push('API Access');
        return features.slice(0, 7);
    };

    return (
        <>
            {/* Professional Loader */}
            {showLoader && (
                <Loader
                    isLoading={isLoading}
                    onTransitionEnd={() => !isLoading && setShowLoader(false)}
                />
            )}

            <div className="landing-page">
                {/* Navigation */}
                <nav className={`landing-nav ${isScrolled ? 'scrolled' : ''}`}>
                    <div className="nav-container">
                        <div className="nav-logo">
                            <div className="logo-icon">
                                <Zap size={24} />
                            </div>
                            <span className="logo-text">BooksNeo</span>
                        </div>
                        <div className="nav-links">
                            <a href="#features">Features</a>
                            <a href="#pricing">Pricing</a>
                            <a href="#tally-connector">Download</a>
                            <a href="#testimonials">Reviews</a>
                        </div>
                        <div className="nav-actions">
                            <button
                                className="btn-nav-secondary"
                                onClick={toggleTheme}
                                // Make it look like a ghost button
                                style={{
                                    padding: '0.5rem',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <Link to="/login" className="btn-nav-secondary">Login</Link>
                            <Link to="/register" className="btn-nav-primary">
                                Get Started Free
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="hero-section">
                    <div className="hero-bg-effects">
                        <div className="hero-glow hero-glow-1"></div>
                        <div className="hero-glow hero-glow-2"></div>
                        <div className="hero-grid"></div>
                    </div>

                    <div className="hero-content">
                        <div className="hero-badge">
                            <Sparkles size={14} />
                            <span>AI-Powered Accounting Automation</span>
                        </div>

                        <h1 className="hero-title">
                            Transform Your
                            <span className="gradient-text"> Bank Statements </span>
                            Into Tally Vouchers
                        </h1>

                        <p className="hero-subtitle">
                            Automate transaction categorization with AI, sync seamlessly with Tally Prime,
                            and save hours of manual data entry. Built for CAs, accountants, and finance teams.
                        </p>

                        <div className="hero-cta">
                            <Link to="/register" className="btn-hero-primary">
                                Start Free Trial
                                <ArrowRight size={20} />
                            </Link>
                            <a href="#features" className="btn-hero-secondary">
                                See How It Works
                            </a>
                        </div>

                        <div className="hero-stats">
                            {stats.map((stat, index) => (
                                <div key={index} className="hero-stat">
                                    <span className="stat-value">{stat.value}</span>
                                    <span className="stat-label">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="dashboard-preview">
                            <img
                                src="/dashboard-preview.png"
                                alt="BooksNeo Dashboard - AI-powered accounting automation"
                                className="dashboard-preview-image"
                            />
                        </div>
                    </div>
                </section>

                {/* Workflow Section */}
                <section className="workflow-section">
                    <div className="section-container">
                        <div className="section-header">
                            <span className="section-badge">How It Works</span>
                            <h2>From Bank Statement to Tally in 3 Steps</h2>
                            <p>Streamline your accounting workflow with our intelligent automation</p>
                        </div>

                        <div className="workflow-steps">
                            <div className="workflow-step">
                                <div className="step-number">1</div>
                                <div className="step-icon">
                                    <Upload size={32} />
                                </div>
                                <h3>Upload Statement</h3>
                                <p>Upload your bank statement in CSV, Excel, or PDF format. We support 14+ bank formats.</p>
                            </div>

                            <div className="workflow-connector">
                                <ChevronRight size={24} />
                            </div>

                            <div className="workflow-step">
                                <div className="step-number">2</div>
                                <div className="step-icon">
                                    <Brain size={32} />
                                </div>
                                <h3>AI Categorization</h3>
                                <p>Our AI automatically categorizes transactions and maps them to appropriate ledgers.</p>
                            </div>

                            <div className="workflow-connector">
                                <ChevronRight size={24} />
                            </div>

                            <div className="workflow-step">
                                <div className="step-number">3</div>
                                <div className="step-icon">
                                    <RefreshCcw size={32} />
                                </div>
                                <h3>Sync to Tally</h3>
                                <p>Push verified transactions as vouchers directly to Tally Prime with one click.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="features-section">
                    <div className="section-container">
                        <div className="section-header">
                            <span className="section-badge">Features</span>
                            <h2>Everything You Need for Efficient Accounting</h2>
                            <p>Powerful features designed for modern accounting professionals</p>
                        </div>

                        <div className="features-grid">
                            {features.map((feature, index) => (
                                <div key={index} className="feature-card">
                                    <div className="feature-icon">
                                        {feature.icon}
                                    </div>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="pricing-section">
                    <div className="section-container">
                        <div className="section-header">
                            <span className="section-badge">Pricing</span>
                            <h2>Simple, Transparent Pricing</h2>
                            <p>Choose the plan that fits your business needs</p>
                        </div>

                        <div className="billing-toggle">
                            <button
                                className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                                onClick={() => setBillingCycle('monthly')}
                            >
                                Monthly
                            </button>
                            <button
                                className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                                onClick={() => setBillingCycle('yearly')}
                            >
                                Yearly
                                <span className="save-badge">Save 17%</span>
                            </button>
                        </div>

                        <div className="pricing-grid">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`pricing-card ${plan.popular ? 'popular' : ''}`}
                                >
                                    {plan.popular && (
                                        <div className="popular-badge">Most Popular</div>
                                    )}
                                    <div className="plan-header">
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {plan.id !== 'free' && <Crown size={18} style={{ color: 'var(--primary-400)' }} />}
                                            {plan.displayName}
                                        </h3>
                                        <p className="plan-description">{plan.description}</p>
                                    </div>
                                    <div className="plan-price">
                                        <span className="currency">₹</span>
                                        <span className="amount">{getPlanPrice(plan)}</span>
                                        <span className="period">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                                    </div>
                                    {billingCycle === 'yearly' && plan.savings && (
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--success-500)',
                                            marginTop: '-0.5rem',
                                            marginBottom: '1rem'
                                        }}>
                                            Save {plan.savings}
                                        </div>
                                    )}
                                    <ul className="plan-features">
                                        {getPlanFeatures(plan).map((feature, idx) => (
                                            <li key={idx}>
                                                <Check size={16} />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        to="/register"
                                        className={`btn-plan ${plan.popular ? 'primary' : 'secondary'}`}
                                    >
                                        {plan.id === 'free' ? 'Start Free' : 'Get Started'}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Testimonials Section */}
                <section id="testimonials" className="testimonials-section">
                    <div className="section-container">
                        <div className="section-header">
                            <span className="section-badge">Testimonials</span>
                            <h2>Trusted by Accounting Professionals</h2>
                            <p>See what our users have to say about BooksNeo</p>
                        </div>

                        <div className="testimonials-grid">
                            {testimonials.map((testimonial, index) => (
                                <div key={index} className="testimonial-card">
                                    <div className="testimonial-stars">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} size={16} fill="currentColor" />
                                        ))}
                                    </div>
                                    <p className="testimonial-quote">"{testimonial.quote}"</p>
                                    <div className="testimonial-author">
                                        <div className="author-avatar">
                                            {testimonial.author.charAt(0)}
                                        </div>
                                        <div className="author-info">
                                            <span className="author-name">{testimonial.author}</span>
                                            <span className="author-role">{testimonial.role}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Tally Connector Download Section */}
                <section id="tally-connector" className="tally-connector-section">
                    <div className="section-container">
                        <div className="section-header">
                            <span className="section-badge">Tally Integration</span>
                            <h2>Connect BooksNeo with Tally Prime</h2>
                            <p>Download and run our free connector to sync with your local Tally Prime installation</p>
                        </div>

                        <div className="tally-connector-content">
                            <div className="connector-download-card">
                                <div className="download-icon">
                                    <Monitor size={48} />
                                </div>
                                <h3>Tally Proxy Connector</h3>
                                <p className="download-description">
                                    This desktop utility enables secure communication between BooksNeo (cloud)
                                    and your local Tally Prime installation.
                                </p>
                                <a
                                    href="/TallyProxy.exe"
                                    download="TallyProxy.exe"
                                    className="btn-download"
                                >
                                    <Download size={20} />
                                    Download for Windows
                                </a>
                                <span className="download-info">Version 1.0 • 36 MB • Windows 10/11</span>
                            </div>

                            <div className="connector-steps">
                                <h3>How to Set Up</h3>
                                <div className="setup-steps">
                                    <div className="setup-step">
                                        <div className="step-icon-circle">
                                            <span>1</span>
                                        </div>
                                        <div className="step-content">
                                            <h4>Enable ODBC in Tally</h4>
                                            <p>Open Tally Prime → Press <strong>F12</strong> → Advanced Configuration → Set "Enable ODBC Server" to <strong>Yes</strong></p>
                                        </div>
                                    </div>

                                    <div className="setup-step">
                                        <div className="step-icon-circle">
                                            <span>2</span>
                                        </div>
                                        <div className="step-content">
                                            <h4>Download & Run Connector</h4>
                                            <p>Download TallyProxy.exe above and <strong>double-click to run</strong>. Keep the window open while using BooksNeo.</p>
                                        </div>
                                    </div>

                                    <div className="setup-step">
                                        <div className="step-icon-circle">
                                            <span>3</span>
                                        </div>
                                        <div className="step-content">
                                            <h4>Connect from BooksNeo</h4>
                                            <p>Go to <strong>Tally Connector</strong> in BooksNeo dashboard and click "Test Connection". You're all set!</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="connector-note">
                                    <Shield size={18} />
                                    <span>The connector runs locally on your machine. Your Tally data never leaves your computer.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="cta-section">
                    <div className="cta-content">
                        <h2>Ready to Transform Your Accounting Workflow?</h2>
                        <p>Join thousands of professionals already saving hours every week</p>
                        <div className="cta-buttons">
                            <Link to="/register" className="btn-cta-primary">
                                Start Free Trial
                                <ArrowRight size={20} />
                            </Link>
                            <a href="#pricing" className="btn-cta-secondary">
                                View Pricing
                            </a>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="landing-footer">
                    <div className="footer-container">
                        <div className="footer-brand">
                            <div className="footer-logo">
                                <Zap size={24} />
                                <span>BooksNeo</span>
                            </div>
                            <p>Intelligent accounting automation for modern businesses</p>
                        </div>
                        <div className="footer-links">
                            <div className="footer-column">
                                <h4>Product</h4>
                                <a href="#features">Features</a>
                                <a href="#pricing">Pricing</a>
                                <Link to="/login">Login</Link>
                            </div>
                            <div className="footer-column">
                                <h4>Resources</h4>
                                <a href="#">Documentation</a>
                                <a href="#">Help Center</a>
                                <a href="#">API</a>
                            </div>
                            <div className="footer-column">
                                <h4>Company</h4>
                                <a href="#">About</a>
                                <a href="#">Contact</a>
                                <a href="#">Privacy</a>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2025 BooksNeo. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default LandingPage;
