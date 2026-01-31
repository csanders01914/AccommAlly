import { NextRequest, NextResponse } from 'next/server';
import {
    getComplianceMetrics,
    getFinancialMetrics,
    getTrendMetrics,
    getWorkflowMetrics
} from '@/lib/reports';
import { getSession } from '@/lib/auth'; // Assuming auth helper exists, or we check session

export async function GET(request: NextRequest) {
    // Check auth - assuming similar pattern to other APIs
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    try {
        let data;
        switch (type) {
            case 'compliance':
                data = await getComplianceMetrics();
                break;
            case 'financial':
                data = await getFinancialMetrics();
                break;
            case 'trends':
                data = await getTrendMetrics();
                break;
            case 'workflow':
                data = await getWorkflowMetrics();
                break;
            default:
                return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching report data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
