import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, emailHash: true }
    });

    console.log('\n=== ALL USERS ===');
    console.log('Total count:', users.length);
    console.log('');

    for (const u of users) {
        console.log('ID:', u.id);
        console.log('Name:', u.name);
        console.log('Email (encrypted):', u.email?.substring(0, 30) + '...');
        console.log('EmailHash:', u.emailHash);
        console.log('---');
    }

    await prisma.$disconnect();
    process.exit(0);
}

main();
