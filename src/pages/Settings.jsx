/**
 * AI Tally Sync - Settings Page
 */

import { useState } from 'react';
import { Settings as SettingsIcon, Key, Bell, Palette, Shield, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Settings = () => {
    const { actions } = useApp();
    const [settings, setSettings] = useState({
        openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
        model: 'gpt-4o-mini',
        autoSync: false,
        notifications: true,
        theme: 'dark'
    });

    const handleSave = () => {
        actions.addNotification({
            type: 'success',
            message: 'Settings saved successfully'
        });
    };

    return (
        <div className="animate-slideUp">
            <div className="mb-6">
                <h2 className="flex items-center gap-2 mb-2">
                    <SettingsIcon size={24} />
                    Settings
                </h2>
                <p className="text-secondary" style={{ marginBottom: 0 }}>
                    Configure application preferences
                </p>
            </div>

            <div className="dashboard-grid-2">
                {/* API Configuration */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <Key size={18} />
                            API Configuration
                        </h3>
                    </div>

                    <div className="form-group">
                        <label className="form-label">OpenAI API Key</label>
                        <input
                            type="password"
                            className="form-input"
                            value={settings.openaiApiKey}
                            onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                            placeholder="sk-..."
                        />
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                            Your API key is stored locally and never shared
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">AI Model</label>
                        <select
                            className="form-select"
                            value={settings.model}
                            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                        >
                            <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        </select>
                    </div>
                </div>

                {/* Preferences */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title flex items-center gap-2">
                            <Palette size={18} />
                            Preferences
                        </h3>
                    </div>

                    <div className="form-group">
                        <label className="form-label flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={settings.autoSync}
                                onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
                                style={{ width: '16px', height: '16px' }}
                            />
                            Auto-sync with Tally after categorization
                        </label>
                    </div>

                    <div className="form-group">
                        <label className="form-label flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={settings.notifications}
                                onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                                style={{ width: '16px', height: '16px' }}
                            />
                            Enable notifications
                        </label>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Theme</label>
                        <select
                            className="form-select"
                            value={settings.theme}
                            onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                        >
                            <option value="dark">Dark</option>
                            <option value="light">Light (Coming Soon)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end mt-6">
                <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={18} />
                    Save Settings
                </button>
            </div>
        </div>
    );
};

export default Settings;
