import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { text, mode } = await request.json();

        if (!text || !mode) {
            return NextResponse.json({ error: 'Missing text or mode' }, { status: 400 });
        }

        let result;
        if (mode === 'encrypt') {
            result = encrypt(text);
        } else if (mode === 'decrypt') {
            result = decrypt(text);
            if (!result) return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
        } else {
            return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }

        return NextResponse.json({ result });

    } catch (e) {
        console.error('Crypto error:', e);
        return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
    }
}
