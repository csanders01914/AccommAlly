'use client';

import { useState } from 'react';
import { ComplianceTab } from '@/components/reports/ComplianceTab';
import { FinancialTab } from '@/components/reports/FinancialTab';
import { TrendsTab } from '@/components/reports/TrendsTab';
import { WorkflowTab } from '@/components/reports/WorkflowTab';
import { BarChart3, ShieldCheck, DollarSign, TrendingUp, Activity, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<'compliance' | 'financial' | 'trends' | 'workflow'>('compliance');
    const [exporting, setExporting] = useState(false);

    const tabs = [
        { id: 'compliance', label: 'Compliance & SLA', icon: ShieldCheck },
        { id: 'financial', label: 'Financial Impact', icon: DollarSign },
        { id: 'trends', label: 'Trends & Analysis', icon: TrendingUp },
        { id: 'workflow', label: 'Workflow Performance', icon: Activity },
    ] as const;

    const handleExport = async () => {
        setExporting(true);
        try {
            // Fetch all data in parallel
            const [complianceRes, financialRes, trendsRes, workflowRes] = await Promise.all([
                fetch('/api/reports?type=compliance'),
                fetch('/api/reports?type=financial'),
                fetch('/api/reports?type=trends'),
                fetch('/api/reports?type=workflow'),
            ]);

            const complianceData = await complianceRes.json();
            const financialData = await financialRes.json();
            const trendsData = await trendsRes.json();
            const workflowData = await workflowRes.json();

            // Create Workbook
            const workbook = XLSX.utils.book_new();

            // --- Compliance Sheet ---
            const complianceSummary = [
                ['Metric', 'Value'],
                ['Initial Response Lag (Avg Days)', complianceData.initialResponseLag],
                ['Average Case Duration (Avg Days)', complianceData.avgCaseDuration],
                ['', ''],
                ['Recertification Calendar (Next 6 Months)', ''],
                ['Review Date', 'Case Number', 'Client', 'Type']
            ];
            const complianceRows = complianceData.expiringAccommodations.map((a: any) => [
                format(new Date(a.reviewDate), 'yyyy-MM-dd'),
                a.caseNumber,
                a.clientName,
                a.type
            ]);
            const complianceSheet = XLSX.utils.aoa_to_sheet([...complianceSummary, ...complianceRows]);
            XLSX.utils.book_append_sheet(workbook, complianceSheet, 'Compliance');

            // --- Financial Sheet ---
            const financialSummary = [
                ['Metric', 'Value'],
                ['Internal Spend', financialData.internalExternal.find((x: any) => x.name === 'Internal')?.value || 0],
                ['External Spend', financialData.internalExternal.find((x: any) => x.name === 'External')?.value || 0],
                ['', ''],
                ['Cost by Job Family', ''],
            ];
            const costRows = financialData.costByJobFamily.map((x: any) => [x.name, x.value]);
            const taxRowsTitle = [['', ''], ['Tax Credit Eligible Items', ''], ['Type', 'Description', 'Cost']];
            const taxRows = financialData.taxCreditEligible.map((x: any) => [x.type, x.description, x.actualCost]);

            const financialSheet = XLSX.utils.aoa_to_sheet([
                ...financialSummary,
                ...costRows,
                ...taxRowsTitle,
                ...taxRows
            ]);
            XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financial');

            // --- Trends Sheet ---
            const trendsSheet = XLSX.utils.json_to_sheet([
                ...trendsData.typeDistribution.map((x: any) => ({ Category: 'Type Dist', Name: x.name, Value: x.value })),
                ...trendsData.jobRoleStats.map((x: any) => ({ Category: 'Job Roles', Name: x.name, Value: x.value })),
                ...trendsData.denialReasons.map((x: any) => ({ Category: 'Denials', Name: x.name, Value: x.value })),
            ]);
            XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Trends');

            // --- Workflow Sheet ---
            const workflowSheet = XLSX.utils.json_to_sheet([
                { Metric: 'Closure Ratio', Value: workflowData.outcomeStats.closedRatio + '%' },
                ...workflowData.interactions.map((x: any) => ({ Metric: `Interaction - ${x.name}`, Value: x.value })),
                {},
                { Metric: 'Pending Medical Docs', Value: '' },
                ...workflowData.pendingMedical.map((x: any) => ({
                    Metric: x.caseNumber,
                    Value: `Client: ${x.clientName}, Updated: ${format(new Date(x.lastUpdated), 'yyyy-MM-dd')}`
                }))
            ]);
            XLSX.utils.book_append_sheet(workbook, workflowSheet, 'Workflow');

            // Export
            XLSX.writeFile(workbook, `AccommAlly_Reports_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-blue-600" />
                        Reports
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Track key metrics, compliance SLAs, and financial impact.
                    </p>
                </div>

                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {exporting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Exporting...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            Export to Excel
                        </>
                    )}
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-white/20 dark:border-gray-700/30">
                <nav className="flex space-x-8 overflow-x-auto pb-1" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors
                  ${isActive
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-white/30'
                                    }
                `}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'compliance' && <ComplianceTab />}
                {activeTab === 'financial' && <FinancialTab />}
                {activeTab === 'trends' && <TrendsTab />}
                {activeTab === 'workflow' && <WorkflowTab />}
            </div>
        </div>
    );
}
