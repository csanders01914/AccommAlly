import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logPath = path.join(process.cwd(), 'login-debug.txt');

    if (!fs.existsSync(logPath)) {
        return NextResponse.json({ logs: [] });
    }

    try {
        const fileContent = fs.readFileSync(logPath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');

        const logs = lines.map((line, index) => {
            try {
                // Try to decrypt the line
                // If it's a legacy plaintext line, decrypt might return garbage or the original text depending on implementation,
                // but our encrypt/decrypt handles format checks.
                const decrypted = decrypt(line);

                // Check if it looks like a log entry with timestamp
                // Expected format after decrypt: "[ISO-Date] Message"
                const match = decrypted.match(/^\[(.*?)\] (.*)$/);
                if (match) {
                    return {
                        id: index,
                        timestamp: match[1],
                        message: match[2],
                        original: line.substring(0, 20) + '...' // truncated encrypted
                    };
                } else {
                    return {
                        id: index,
                        timestamp: 'Unknown',
                        message: decrypted, // Fallback
                        original: line.substring(0, 20) + '...'
                    };
                }
            } catch (e) {
                return {
                    id: index,
                    timestamp: 'Error',
                    message: 'Failed to decrypt line',
                    original: line.substring(0, 20) + '...'
                };
            }
        });

        // Reverse to show newest first
        return NextResponse.json({ logs: logs.reverse() });

    } catch (error) {
        console.error('Error reading logs:', error);
        return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
    }
}
