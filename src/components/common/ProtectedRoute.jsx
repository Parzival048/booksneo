/**
 * AI Tally Sync - Protected Route Component
 * Redirects to login if not authenticated
 */

import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, initialized } = useAuth();
    const location = useLocation();

    // Only show loading during initial auth check (not during subsequent operations)
    if (!initialized) {
        return (
            <div className="auth-loading-screen">
                <div className="loading-content">
                    <Loader2 className="animate-spin" size={40} />
                    <p>Loading...</p>
                </div>
                <style>{`
                    .auth-loading-screen {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: var(--bg-primary);
                    }
                    .loading-content {
                        text-align: center;
                    }
                    .loading-content svg {
                        color: var(--primary-400);
                        margin-bottom: 1rem;
                    }
                    .loading-content p {
                        color: var(--text-secondary);
                    }
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
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
