/**
 * AI Tally Sync - Main Layout Component
 * Wraps the entire application with sidebar and header
 * Includes mobile-responsive sidebar with overlay
 */

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Toast from '../common/Toast';
import { useApp } from '../../context/AppContext';

const Layout = () => {
    const { state } = useApp();
    const location = useLocation();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Close sidebar when route changes on mobile
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location.pathname]);

    // Track window resize for mobile detection
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (!mobile) {
                setIsMobileSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (isMobileSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileSidebarOpen]);

    const toggleMobileSidebar = () => {
        setIsMobileSidebarOpen(prev => !prev);
    };

    const closeMobileSidebar = () => {
        setIsMobileSidebarOpen(false);
    };

    // Determine margin-left based on screen size
    const mainContentStyle = isMobile
        ? {} // No margin on mobile - sidebar is hidden
        : {
            marginLeft: state.ui.sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
            transition: 'margin-left var(--transition-slow)'
        };

    return (
        <div className="app-layout">
            {/* Mobile Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${isMobileSidebarOpen ? 'open' : ''}`}
                onClick={closeMobileSidebar}
                aria-hidden="true"
            />

            {/* Sidebar Navigation */}
            <Sidebar
                isOpen={isMobileSidebarOpen}
                onClose={closeMobileSidebar}
            />

            {/* Main Content Area */}
            <main
                className="main-content"
                style={mainContentStyle}
            >
                {/* Header */}
                <Header onMenuToggle={toggleMobileSidebar} />

                {/* Page Content */}
                <div className="page-content animate-fadeIn">
                    <Outlet />
                </div>
            </main>

            {/* Toast Notifications */}
            <Toast />
        </div>
    );
};

export default Layout;
