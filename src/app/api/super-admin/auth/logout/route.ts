import { SUPER_ADMIN_SESSION_COOKIE_NAME } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
 const cookieStore = await cookies();
 cookieStore.delete(SUPER_ADMIN_SESSION_COOKIE_NAME);

 return NextResponse.json({ success: true });
}
