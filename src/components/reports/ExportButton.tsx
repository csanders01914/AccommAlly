'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { PaymentModal } from '@/components/reports/PaymentModal';

interface PriceInfo {
    pageCount: number;
    amountCents: number;
    amountDisplay: string;
}

type ExportState = 'idle' | 'fetching-price' | 'awaiting-payment' | 'downloading' | 'done';

export function ExportButton() {
    const [exportState, setExportState] = useState<ExportState>('idle');
    const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ── Step 1: Fetch page count & price, then open payment modal ──────────────
    const handleClick = async () => {
        if (exportState !== 'idle' && exportState !== 'done') return;

        setErrorMsg(null);
        setExportState('fetching-price');

        try {
            const res = await fetch('/api/reports/page-count');
            if (!res.ok) throw new Error('Could not estimate export size. Please try again.');
            const data: PriceInfo = await res.json();
            setPriceInfo(data);
            setExportState('awaiting-payment');
        } catch (err: any) {
            setErrorMsg(err.message ?? 'An error occurred.');
            setExportState('idle');
        }
    };

    // ── Step 2: Payment succeeded → download with the signed token ─────────────
    const handlePaymentSuccess = async (exportToken: string) => {
        setExportState('downloading');

        try {
            const headers = { Authorization: `Bearer ${exportToken}` };

            const [complianceRes, financialRes, trendsRes, workflowRes] = await Promise.all([
                fetch('/api/reports/export?type=compliance', { headers }),
                fetch('/api/reports/export?type=financial', { headers }),
                fetch('/api/reports/export?type=trends', { headers }),
                fetch('/api/reports/export?type=workflow', { headers }),
            ]);

            if (!complianceRes.ok || !financialRes.ok || !trendsRes.ok || !workflowRes.ok) {
                throw new Error('Failed to fetch report data. Your export token may have expired — please try again.');
            }

            const [complianceData, financialData, trendsData, workflowData] = await Promise.all([
                complianceRes.json(),
                financialRes.json(),
                trendsRes.json(),
                workflowRes.json(),
            ]);

            const workbook = XLSX.utils.book_new();

            // ── Compliance Sheet ────────────────────────────────────────────────
            const complianceSummary = [
                ['Metric', 'Value'],
                ['Initial Response Lag (Avg Days)', complianceData.initialResponseLag],
                ['Average Case Duration (Avg Days)', complianceData.avgCaseDuration],
                ['', ''],
                ['Recertification Calendar (Next 6 Months)', ''],
                ['Review Date', 'Case Number', 'Client', 'Type'],
            ];
            const complianceRows = complianceData.expiringAccommodations.map((a: any) => [
                format(new Date(a.reviewDate), 'yyyy-MM-dd'),
                a.caseNumber,
                a.clientName,
                a.type,
            ]);
            XLSX.utils.book_append_sheet(
                workbook,
                XLSX.utils.aoa_to_sheet([...complianceSummary, ...complianceRows]),
                'Compliance'
            );

            // ── Financial Sheet ─────────────────────────────────────────────────
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
            XLSX.utils.book_append_sheet(
                workbook,
                XLSX.utils.aoa_to_sheet([...financialSummary, ...costRows, ...taxRowsTitle, ...taxRows]),
                'Financial'
            );

            // ── Trends Sheet ────────────────────────────────────────────────────
            XLSX.utils.book_append_sheet(
                workbook,
                XLSX.utils.json_to_sheet([
                    ...trendsData.typeDistribution.map((x: any) => ({ Category: 'Type Dist', Name: x.name, Value: x.value })),
                    ...trendsData.jobRoleStats.map((x: any) => ({ Category: 'Job Roles', Name: x.name, Value: x.value })),
                    ...trendsData.denialReasons.map((x: any) => ({ Category: 'Denials', Name: x.name, Value: x.value })),
                ]),
                'Trends'
            );

            // ── Workflow Sheet ──────────────────────────────────────────────────
            XLSX.utils.book_append_sheet(
                workbook,
                XLSX.utils.json_to_sheet([
                    { Metric: 'Closure Ratio', Value: workflowData.outcomeStats.closedRatio + '%' },
                    ...workflowData.interactions.map((x: any) => ({ Metric: `Interaction - ${x.name}`, Value: x.value })),
                    {},
                    { Metric: 'Pending Medical Docs', Value: '' },
                    ...workflowData.pendingMedical.map((x: any) => ({
                        Metric: x.caseNumber,
                        Value: `Client: ${x.clientName}, Updated: ${format(new Date(x.lastUpdated), 'yyyy-MM-dd')}`,
                    })),
                ]),
                'Workflow'
            );

            XLSX.writeFile(workbook, `AccommAlly_Reports_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            setExportState('done');

            // Reset to idle after a moment so user can export again
            setTimeout(() => {
                setExportState('idle');
                setPriceInfo(null);
            }, 3000);
        } catch (err: any) {
            setErrorMsg(err.message ?? 'Download failed. Please try again within the 5-minute window.');
            setExportState('idle');
        }
    };

    // ── Button label / state ───────────────────────────────────────────────────
    const buttonContent = () => {
        switch (exportState) {
            case 'fetching-price':
                return <><Loader2 className="w-4 h-4 animate-spin" /> Calculating price…</>;
            case 'awaiting-payment':
                return <><Loader2 className="w-4 h-4 animate-spin" /> Awaiting payment…</>;
            case 'downloading':
                return <><Loader2 className="w-4 h-4 animate-spin" /> Downloading…</>;
            case 'done':
                return <><Download className="w-4 h-4" /> Downloaded!</>;
            default:
                return <><Download className="w-4 h-4" /> Export to Excel</>;
        }
    };

    return (
        <>
            <div className="flex flex-col items-end gap-1">
                <button
                    id="export-report-btn"
                    onClick={handleClick}
                    disabled={exportState !== 'idle' && exportState !== 'done'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed
                        ${exportState === 'done'
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-[#0D9488] hover:bg-[#0F766E] text-white'
                        }`}
                >
                    {buttonContent()}
                </button>

                {errorMsg && (
                    <p className="text-xs text-red-500 max-w-xs text-right">{errorMsg}</p>
                )}
            </div>

            {exportState === 'awaiting-payment' && priceInfo && (
                <PaymentModal
                    priceInfo={priceInfo}
                    onSuccess={handlePaymentSuccess}
                    onClose={() => {
                        setExportState('idle');
                        setPriceInfo(null);
                    }}
                />
            )}
        </>
    );
}
