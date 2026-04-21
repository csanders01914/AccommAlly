'use client';

import { useState } from 'react';
import { ComplianceTab } from '@/components/reports/ComplianceTab';
import { FinancialTab } from '@/components/reports/FinancialTab';
import { TrendsTab } from '@/components/reports/TrendsTab';
import { WorkflowTab } from '@/components/reports/WorkflowTab';
import { ExportButton } from '@/components/reports/ExportButton';
import { BarChart3, ShieldCheck, DollarSign, TrendingUp, Activity } from 'lucide-react';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<'compliance' | 'financial' | 'trends' | 'workflow'>('compliance');

    const tabs = [
        { id: 'compliance', label: 'Compliance & SLA', icon: ShieldCheck },
        { id: 'financial', label: 'Financial Impact', icon: DollarSign },
        { id: 'trends', label: 'Trends & Analysis', icon: TrendingUp },
        { id: 'workflow', label: 'Workflow Performance', icon: Activity },
    ] as const;



    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1C1A17] flex items-center gap-3">
                        <BarChart3 className="h-7 w-7 text-[#0D9488]" />
                        Reports
                    </h1>
                    <p className="text-[#8C8880] mt-1">
                        Track key metrics, compliance SLAs, and financial impact.
                    </p>
                </div>

                <ExportButton />
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-[#E5E2DB]">
                <nav className="flex space-x-8 overflow-x-auto pb-px" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                                    isActive
                                        ? 'border-[#0D9488] text-[#0D9488]'
                                        : 'border-transparent text-[#8C8880] hover:text-[#5C5850] hover:border-[#E5E2DB]'
                                }`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <Icon className={`h-4 w-4 ${isActive ? 'text-[#0D9488]' : 'text-[#8C8880]'}`} />
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
