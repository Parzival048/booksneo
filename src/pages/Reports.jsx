/**
 * AI Tally Sync - Reports & Analytics Module
 * Cash flow analysis, expense trends, monthly comparisons
 */

import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import PlanGate from '../components/common/PlanGate';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    PieChart,
    Calendar,
    Download,
    Filter,
    FileText,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { formatCurrency, formatDate } from '../utils/helpers';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler);

const Reports = () => {
    const { state, actions } = useApp();
    const { hasFeatureAccess } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const { transactions } = state.banking;

    // Helper to safely parse dates
    const safeParseDate = (dateStr) => {
        if (!dateStr) return null;

        // Handle DD/MM/YYYY format (common in Indian statements)
        if (typeof dateStr === 'string') {
            const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
            if (ddmmyyyyMatch) {
                const [, day, month, year] = ddmmyyyyMatch;
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
        }

        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    };

    // Calculate analytics data
    const analytics = useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return {
                totalInflow: 0,
                totalOutflow: 0,
                netCashFlow: 0,
                categoryBreakdown: {},
                monthlyData: {},
                topExpenses: [],
                topIncomes: []
            };
        }

        // Filter by selected month if applicable
        const filteredTxns = selectedPeriod === 'all' ? transactions :
            transactions.filter(t => {
                const txnDate = safeParseDate(t.date);
                if (!txnDate) return false;
                try {
                    const txnMonth = txnDate.toISOString().slice(0, 7);
                    return txnMonth === selectedMonth;
                } catch (e) {
                    return false;
                }
            });

        // Total inflow and outflow
        const totalInflow = filteredTxns.reduce((sum, t) => sum + (t.credit || 0), 0);
        const totalOutflow = filteredTxns.reduce((sum, t) => sum + (t.debit || 0), 0);
        const netCashFlow = totalInflow - totalOutflow;

        // Category breakdown
        const categoryBreakdown = {};
        filteredTxns.forEach(t => {
            const category = t.userCategory || t.aiCategory || 'Uncategorized';
            if (!categoryBreakdown[category]) {
                categoryBreakdown[category] = { credit: 0, debit: 0, count: 0 };
            }
            categoryBreakdown[category].credit += t.credit || 0;
            categoryBreakdown[category].debit += t.debit || 0;
            categoryBreakdown[category].count += 1;
        });

        // Monthly data for trend chart
        const monthlyData = {};
        transactions.forEach(t => {
            const txnDate = safeParseDate(t.date);
            if (!txnDate) return;
            try {
                const month = txnDate.toISOString().slice(0, 7);
                if (!monthlyData[month]) {
                    monthlyData[month] = { credit: 0, debit: 0 };
                }
                monthlyData[month].credit += t.credit || 0;
                monthlyData[month].debit += t.debit || 0;
            } catch (e) {
                // Skip invalid dates
            }
        });

        // Top expenses
        const topExpenses = filteredTxns
            .filter(t => t.debit > 0)
            .sort((a, b) => b.debit - a.debit)
            .slice(0, 5);

        // Top incomes
        const topIncomes = filteredTxns
            .filter(t => t.credit > 0)
            .sort((a, b) => b.credit - a.credit)
            .slice(0, 5);

        return {
            totalInflow,
            totalOutflow,
            netCashFlow,
            categoryBreakdown,
            monthlyData,
            topExpenses,
            topIncomes,
            transactionCount: filteredTxns.length
        };
    }, [transactions, selectedPeriod, selectedMonth]);

    // Chart data - Category Pie Chart
    const categoryPieData = useMemo(() => {
        const categories = Object.entries(analytics.categoryBreakdown)
            .filter(([_, data]) => data.debit > 0)
            .sort((a, b) => b[1].debit - a[1].debit)
            .slice(0, 8);

        return {
            labels: categories.map(([cat]) => cat),
            datasets: [{
                data: categories.map(([_, data]) => data.debit),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(249, 115, 22, 0.8)'
                ],
                borderWidth: 0
            }]
        };
    }, [analytics.categoryBreakdown]);

    // Chart data - Monthly Trend
    const monthlyTrendData = useMemo(() => {
        const months = Object.keys(analytics.monthlyData).sort();

        return {
            labels: months.map(m => {
                const [year, month] = m.split('-');
                return new Date(year, parseInt(month) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
            }),
            datasets: [
                {
                    label: 'Income',
                    data: months.map(m => analytics.monthlyData[m].credit),
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Expense',
                    data: months.map(m => analytics.monthlyData[m].debit),
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };
    }, [analytics.monthlyData]);

    // Chart data - Category Bar Chart
    const categoryBarData = useMemo(() => {
        const categories = Object.entries(analytics.categoryBreakdown)
            .sort((a, b) => (b[1].debit + b[1].credit) - (a[1].debit + a[1].credit))
            .slice(0, 6);

        return {
            labels: categories.map(([cat]) => cat.length > 12 ? cat.slice(0, 12) + '...' : cat),
            datasets: [
                {
                    label: 'Credit',
                    data: categories.map(([_, data]) => data.credit),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderRadius: 4
                },
                {
                    label: 'Debit',
                    data: categories.map(([_, data]) => data.debit),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderRadius: 4
                }
            ]
        };
    }, [analytics.categoryBreakdown]);

    // Chart options
    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: { color: '#94a3b8', font: { size: 11 } }
            }
        }
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#94a3b8' }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8' }
            },
            y: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: {
                    color: '#94a3b8',
                    callback: (value) => '₹' + (value >= 1000 ? (value / 1000).toFixed(0) + 'K' : value)
                }
            }
        }
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#94a3b8' }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8', font: { size: 10 } }
            },
            y: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: {
                    color: '#94a3b8',
                    callback: (value) => '₹' + (value >= 1000 ? (value / 1000).toFixed(0) + 'K' : value)
                }
            }
        }
    };

    // Export report
    const handleExportReport = () => {
        const reportData = {
            generatedAt: new Date().toISOString(),
            period: selectedPeriod === 'all' ? 'All Time' : selectedMonth,
            summary: {
                totalInflow: analytics.totalInflow,
                totalOutflow: analytics.totalOutflow,
                netCashFlow: analytics.netCashFlow,
                transactionCount: analytics.transactionCount
            },
            categoryBreakdown: analytics.categoryBreakdown,
            topExpenses: analytics.topExpenses.map(t => ({
                date: t.date,
                description: t.description,
                amount: t.debit,
                category: t.userCategory || t.aiCategory
            })),
            topIncomes: analytics.topIncomes.map(t => ({
                date: t.date,
                description: t.description,
                amount: t.credit,
                category: t.userCategory || t.aiCategory
            }))
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report_${selectedMonth || 'all'}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        actions.addNotification({
            type: 'success',
            message: 'Report exported successfully'
        });
    };

    // Check if user has access to reports feature
    if (!hasFeatureAccess('reports')) {
        return (
            <PlanGate
                feature="reports"
                requiredPlan="Starter"
                fallbackMessage="Reports & Analytics is a Starter feature. Upgrade to access cash flow analysis, expense trends, and detailed financial insights."
            >
                <div />
            </PlanGate>
        );
    }

    return (
        <div className="animate-slideUp">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <BarChart3 size={28} />
                        Reports & Analytics
                    </h1>
                    <p className="page-subtitle">Cash flow analysis and expense insights</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn btn-secondary"
                        onClick={handleExportReport}
                    >
                        <Download size={16} /> Export Report
                    </button>
                </div>
            </div>

            {/* Period Selector */}
            <div className="card mb-6">
                <div className="flex items-center gap-4" style={{ padding: 'var(--space-4)' }}>
                    <div className="flex items-center gap-2">
                        <Calendar size={18} style={{ color: 'var(--primary-400)' }} />
                        <span style={{ fontWeight: 500 }}>Period:</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className={`btn btn-sm ${selectedPeriod === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setSelectedPeriod('month')}
                        >
                            Monthly
                        </button>
                        <button
                            className={`btn btn-sm ${selectedPeriod === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setSelectedPeriod('all')}
                        >
                            All Time
                        </button>
                    </div>
                    {selectedPeriod === 'month' && (
                        <input
                            type="month"
                            className="form-input"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{ width: '180px' }}
                        />
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="dashboard-grid mb-6">
                <div className="stat-card">
                    <div className="stat-content">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={20} style={{ color: 'var(--success-500)' }} />
                            <p className="stat-label">Total Inflow</p>
                        </div>
                        <p className="stat-value" style={{ color: 'var(--success-500)' }}>
                            {formatCurrency(analytics.totalInflow)}
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <div className="flex items-center gap-2">
                            <TrendingDown size={20} style={{ color: 'var(--error-500)' }} />
                            <p className="stat-label">Total Outflow</p>
                        </div>
                        <p className="stat-value" style={{ color: 'var(--error-500)' }}>
                            {formatCurrency(analytics.totalOutflow)}
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <div className="flex items-center gap-2">
                            {analytics.netCashFlow >= 0 ? (
                                <ArrowUpRight size={20} style={{ color: 'var(--success-500)' }} />
                            ) : (
                                <ArrowDownRight size={20} style={{ color: 'var(--error-500)' }} />
                            )}
                            <p className="stat-label">Net Cash Flow</p>
                        </div>
                        <p className="stat-value" style={{
                            color: analytics.netCashFlow >= 0 ? 'var(--success-500)' : 'var(--error-500)'
                        }}>
                            {formatCurrency(analytics.netCashFlow)}
                        </p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <div className="flex items-center gap-2">
                            <FileText size={20} style={{ color: 'var(--primary-400)' }} />
                            <p className="stat-label">Transactions</p>
                        </div>
                        <p className="stat-value">{analytics.transactionCount || 0}</p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                {/* Monthly Trend */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ fontSize: 'var(--text-md)' }}>
                            <TrendingUp size={18} /> Cash Flow Trend
                        </h3>
                    </div>
                    <div style={{ padding: 'var(--space-4)', height: '280px' }}>
                        {Object.keys(analytics.monthlyData).length > 0 ? (
                            <Line data={monthlyTrendData} options={lineOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Category Pie */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ fontSize: 'var(--text-md)' }}>
                            <PieChart size={18} /> Expense by Category
                        </h3>
                    </div>
                    <div style={{ padding: 'var(--space-4)', height: '280px' }}>
                        {categoryPieData.labels.length > 0 ? (
                            <Pie data={categoryPieData} options={pieOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                                No expense data
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Category Bar Chart */}
            <div className="card mb-6">
                <div className="card-header">
                    <h3 className="card-title" style={{ fontSize: 'var(--text-md)' }}>
                        <BarChart3 size={18} /> Category Comparison
                    </h3>
                </div>
                <div style={{ padding: 'var(--space-4)', height: '280px' }}>
                    {categoryBarData.labels.length > 0 ? (
                        <Bar data={categoryBarData} options={barOptions} />
                    ) : (
                        <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                            No category data
                        </div>
                    )}
                </div>
            </div>

            {/* Top Transactions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {/* Top Expenses */}
                <div className="card">
                    <div className="card-header" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                        <h3 className="card-title" style={{ fontSize: 'var(--text-md)', color: 'var(--error-400)' }}>
                            <TrendingDown size={18} /> Top Expenses
                        </h3>
                    </div>
                    <div>
                        {analytics.topExpenses.length > 0 ? (
                            analytics.topExpenses.map((t, idx) => (
                                <div
                                    key={t.id || idx}
                                    style={{
                                        padding: 'var(--space-3) var(--space-4)',
                                        borderBottom: '1px solid var(--border-default)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>
                                            {t.description?.substring(0, 40) || 'No description'}
                                        </p>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                            {formatDate(t.date)} • {t.userCategory || t.aiCategory || 'Uncategorized'}
                                        </p>
                                    </div>
                                    <span style={{ color: 'var(--error-500)', fontWeight: 600 }}>
                                        -{formatCurrency(t.debit)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No expenses in this period
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Incomes */}
                <div className="card">
                    <div className="card-header" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                        <h3 className="card-title" style={{ fontSize: 'var(--text-md)', color: 'var(--success-400)' }}>
                            <TrendingUp size={18} /> Top Incomes
                        </h3>
                    </div>
                    <div>
                        {analytics.topIncomes.length > 0 ? (
                            analytics.topIncomes.map((t, idx) => (
                                <div
                                    key={t.id || idx}
                                    style={{
                                        padding: 'var(--space-3) var(--space-4)',
                                        borderBottom: '1px solid var(--border-default)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <p style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>
                                            {t.description?.substring(0, 40) || 'No description'}
                                        </p>
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                            {formatDate(t.date)} • {t.userCategory || t.aiCategory || 'Uncategorized'}
                                        </p>
                                    </div>
                                    <span style={{ color: 'var(--success-500)', fontWeight: 600 }}>
                                        +{formatCurrency(t.credit)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No income in this period
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
