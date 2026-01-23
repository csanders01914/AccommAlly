import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function check() {
    try {
        const users = await prisma.user.findMany();
        console.log('Users found:', users.length);
        users.forEach((u: any) => console.log(`- ${u.id} (Role: ${u.role})`));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
