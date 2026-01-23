
process.env.ENCRYPTION_KEY = "b8fe57c6c406205d1502421396245367b8fe57c6c406205d1502421396245367";
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function main() {
    const cases = await prisma.case.findMany({
        take: 5,
        select: {
            id: true,
            caseNumber: true,
            clientSSN: true
        }
    });

    console.log('Found cases:', cases.length);

    for (const c of cases) {
        console.log(`Case ${c.caseNumber} (${c.id})`);
        console.log(`  Raw SSN: ${c.clientSSN}`);
        if (c.clientSSN) {
            try {
                const dec = decrypt(c.clientSSN);
                console.log(`  Decrypted: ${dec}`);
                const masked = `***-**-${dec.split('-').pop()?.slice(-4) || '0000'}`;
                console.log(`  Masked: ${masked}`);
            } catch (e) {
                console.error(`  Decryption failed:`, e);
            }
        } else {
            console.log('  SSN is null');
        }
        console.log('---');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
