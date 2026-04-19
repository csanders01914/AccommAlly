import { PrismaClient } from '@prisma/client';

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const userId = 'user-chris-003';

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { role: 'SUPER_ADMIN' },
        });
        console.log(`Successfully updated role for user ${userId} to SUPER_ADMIN`);
    } catch (error) {
        console.error(`Error updating user role: ${error}`);
    } finally {
        await prisma.$disconnect();
    }
}

main();
