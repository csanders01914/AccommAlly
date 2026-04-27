import { NextRequest, NextResponse } from 'next/server';

// This endpoint has been superseded by /api/public/portal/claims/[caseId]/status
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is no longer available. Use /api/public/portal/claims/[caseId]/status instead.' },
    { status: 410 }
  );
}
