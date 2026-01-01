/**
 * AI Tally Sync - Toast Notification Component
 */

import { useApp } from '../../context/AppContext';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
};

const Toast = () => {
    const { state, actions } = useApp();
    const { notifications } = state.ui;

    if (notifications.length === 0) return null;

    return (
        <div className="toast-container">
            {notifications.map(notification => {
                const Icon = iconMap[notification.type] || Info;

                return (
                    <div
                        key={notification.id}
                        className={`toast toast-${notification.type || 'info'}`}
                    >
                        <Icon size={20} />
                        <div style={{ flex: 1 }}>
                            {notification.title && (
                                <strong style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
                                    {notification.title}
                                </strong>
                            )}
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {notification.message}
                            </span>
                        </div>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => actions.removeNotification(notification.id)}
                            style={{ padding: 'var(--space-1)' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default Toast;
