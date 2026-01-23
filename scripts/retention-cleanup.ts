
import { PrismaClient } from '@prisma/client';
import { subYears } from 'date-fns';

const prisma = new PrismaClient();

async function runRetentionPolicy() {
    console.log('--- Running 5-Year Data Retention Policy ---');

    const cutoffDate = subYears(new Date(), 5);
    console.log(`Deleting messages older than: ${cutoffDate.toISOString()}`);

    try {
        const result = await prisma.message.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate
                }
            }
        });

        console.log(`Retention policy complete. Deleted ${result.count} messages.`);
    } catch (error) {
        console.error('Error running retention policy:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runRetentionPolicy();
