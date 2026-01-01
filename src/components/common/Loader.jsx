/**
 * BooksNeo - Professional Landing Page Loader
 * Premium loading animation with branding
 */

import { Zap } from 'lucide-react';
import './Loader.css';

const Loader = ({ isLoading, onTransitionEnd }) => {
    return (
        <div
            className={`loader-overlay ${!isLoading ? 'fade-out' : ''}`}
            onTransitionEnd={onTransitionEnd}
        >
            {/* Background Effects */}
            <div className="loader-bg-effects">
                <div className="loader-glow loader-glow-1"></div>
                <div className="loader-glow loader-glow-2"></div>
                <div className="loader-grid"></div>
            </div>

            {/* Main Loader Content */}
            <div className="loader-content">
                {/* Animated Logo */}
                <div className="loader-logo-container">
                    <div className="loader-logo-ring loader-ring-outer">
                        <div className="loader-ring-segment"></div>
                    </div>
                    <div className="loader-logo-ring loader-ring-inner">
                        <div className="loader-ring-segment"></div>
                    </div>
                    <div className="loader-logo">
                        <Zap size={32} />
                    </div>
                </div>

                {/* Brand Name */}
                <div className="loader-brand">
                    <span className="loader-brand-text">BooksNeo</span>
                    <span className="loader-brand-tagline">Intelligent Accounting</span>
                </div>

                {/* Loading Bar */}
                <div className="loader-progress-container">
                    <div className="loader-progress-track">
                        <div className="loader-progress-bar"></div>
                        <div className="loader-progress-glow"></div>
                    </div>
                </div>

                {/* Loading Dots */}
                <div className="loader-dots">
                    <span className="loader-dot"></span>
                    <span className="loader-dot"></span>
                    <span className="loader-dot"></span>
                </div>
            </div>

            {/* Floating Particles */}
            <div className="loader-particles">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`loader-particle particle-${i + 1}`}></div>
                ))}
            </div>
        </div>
    );
};

export default Loader;
