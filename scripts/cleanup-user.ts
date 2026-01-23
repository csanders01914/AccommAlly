
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
    const userIdToDelete = 'cmklwab7c0002u8n9cutpjnqp';
    console.log(`Deleting corrupted user: ${userIdToDelete}`);
    try {
        await prisma.user.delete({ where: { id: userIdToDelete } });
        console.log('User deleted successfully.');
    } catch (e) {
        console.error('Failed to delete user:', e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
