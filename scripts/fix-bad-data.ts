
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for corrupted user names...');
    const users = await prisma.user.findMany();

    for (const user of users) {
        if (user.name && user.name.length > 50 && !user.name.includes(' ')) {
            // Heuristic: Long string, no spaces - likely a hash/ciphertext
            console.log(`Found suspicious name for user ${user.email}: ${user.name}`);

            await prisma.user.update({
                where: { id: user.id },
                data: { name: 'Corrected User' }
            });
            console.log('Fixed name.');
        }
    }
    console.log('Done.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
