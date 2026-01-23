import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { lookupCreationTime } from '@/lib/generateCaseNumber';

/**
 * GET /api/debug/lookup-v2 - Lookup creation time from claim number or DCN
 * Query params: ?q=AAMKLWDOTJ-001AR or ?q=1705701234567
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 });
        }

        const result = lookupCreationTime(query);

        if (result.type === 'unknown') {
            return NextResponse.json({
                error: 'Unable to parse identifier',
                message: 'Expected a claim number (AAXXXXXXXX-XXXXX) or DCN (13-digit timestamp)',
                input: query
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            type: result.type,
            creationTime: result.creationTime?.toISOString() || null,
            localTime: result.creationTime?.toLocaleString('en-US', {
                timeZone: 'America/Chicago',
                dateStyle: 'full',
                timeStyle: 'long'
            }) || null,
            details: result.details
        });

    } catch (error) {
        console.error('Lookup Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
