import { NextRequest, NextResponse } from 'next/server';

// This endpoint has been superseded by /api/public/portal/claims/[caseId]/messages
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is no longer available. Use /api/public/portal/claims/[caseId]/messages instead.' },
    { status: 410 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is no longer available. Use /api/public/portal/claims/[caseId]/messages instead.' },
    { status: 410 }
  );
}
