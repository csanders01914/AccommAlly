
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectMessages() {
    console.log('--- Inspecting Latest 5 Messages ---');
    try {
        const messages = await prisma.message.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { name: true, email: true } },
                recipient: { select: { name: true, email: true } }
            }
        });

        messages.forEach((m: any) => {
            console.log(`ID: ${m.id}`);
            console.log(`Subject: ${m.subject}`);
            console.log(`Sender: ${m.sender?.name} (${m.senderId})`);
            console.log(`Recipient: ${m.recipient?.name} (${m.recipientId})`);
            console.log(`Flags: Archived=${m.archived}, DeletedBySender=${m.deletedBySender}, DeletedByRecipient=${m.deletedByRecipient}`);
            console.log('---');
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

inspectMessages();
