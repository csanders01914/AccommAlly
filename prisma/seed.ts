import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Process key the same way as src/lib/encryption.ts
const rawKey = (process.env.ENCRYPTION_KEY || '').trim().replace(/^["']|["']$/g, '');
const ENCRYPTION_KEY = rawKey.substring(0, 64);
const IV_LENGTH = 16;

function getKey() {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
        console.error('Invalid ENCRYPTION_KEY in seed. Length:', ENCRYPTION_KEY?.length);
        throw new Error('Invalid ENCRYPTION_KEY');
    }
    return Buffer.from(ENCRYPTION_KEY, 'hex');
}

function encrypt(text: string): string {
    if (!text) return text;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function hash(text: string): string {
    return crypto.createHmac('sha256', getKey()).update(text).digest('hex');
}

function generateClaimantId(): string {
    return crypto.randomInt(100000, 999999).toString();
}

// Helper to generate random alphanumeric string
function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Helper to generate a unique case number (mock)
function generateCaseNumber(org: string = 'TCP', index: number = 1): string {
    // Style: AAMKNLI5N0-001AR (Must start with AA)
    const randomPart = generateRandomString(8); // 8 chars + AA = 10 chars
    const seq = index.toString().padStart(3, '0');
    return `AA${randomPart}-${seq}AR`;
}

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding database...');

    if (!ENCRYPTION_KEY) {
        throw new Error("ENCRYPTION_KEY not found in environment");
    }

    // 0. Wipe Database
    console.log('🧹 Wiping database...');
    // Delete in order of dependencies (Child -> Parent)
    await prisma.messageFolderAssignment.deleteMany();
    await prisma.inboundRuleFolder.deleteMany();
    await prisma.inboundRule.deleteMany();
    await prisma.messageFolder.deleteMany();
    await prisma.reminder.deleteMany();
    await prisma.meetingAttendee.deleteMany();
    await prisma.meeting.deleteMany();
    await prisma.task.deleteMany();
    await prisma.callRequest.deleteMany();
    await prisma.note.deleteMany();
    await prisma.document.deleteMany();
    await prisma.annotation.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.accommodation.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.message.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.identityVerification.deleteMany();
    await prisma.case.deleteMany();
    await prisma.claimFamily.deleteMany();
    await prisma.claimant.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    console.log('✨ Database wiped');

    // Default password for all seed users: "password123"
    const passwordHash = await bcrypt.hash('password123', 10);

    const sarahEmail = 'sarah@accessally.org';
    const michaelEmail = 'michael@accessally.org';
    const chrisEmail = 'csanders0191@proton.me';
    const systemEmail = 'system@accessally.org';

    // 1. Create Users
    const sarah = await prisma.user.upsert({
        where: { emailHash: hash(sarahEmail) },
        update: { passwordHash },
        create: {
            id: 'user-sarah-001',
            email: encrypt(sarahEmail),
            emailHash: hash(sarahEmail),
            passwordHash,
            name: encrypt('Sarah Chen'),
            username: 'ischen',
            role: 'ADMIN',
            active: true,
            preferences: { theme: 'light', layout: [] },
        },
    });

    const michael = await prisma.user.upsert({
        where: { emailHash: hash(michaelEmail) },
        update: { passwordHash },
        create: {
            id: 'user-michael-002',
            email: encrypt(michaelEmail),
            emailHash: hash(michaelEmail),
            passwordHash,
            name: encrypt('Michael Torres'),
            username: 'mtorres',
            role: 'COORDINATOR',
            active: true,
            preferences: { theme: 'system', layout: [] },
        },
    });

    const chris = await prisma.user.upsert({
        where: { emailHash: hash(chrisEmail) },
        update: { passwordHash, role: 'ADMIN' },
        create: {
            id: 'user-chris-003',
            email: encrypt(chrisEmail),
            emailHash: hash(chrisEmail),
            passwordHash,
            name: encrypt('Chris Sanders'),
            username: 'csanders',
            role: 'ADMIN',
            active: true,
            preferences: { theme: 'system', layout: [] },
        },
    });

    const system = await prisma.user.upsert({
        where: { emailHash: hash(systemEmail) },
        update: { passwordHash, role: 'ADMIN' },
        create: {
            id: 'user-system-000',
            email: encrypt(systemEmail),
            emailHash: hash(systemEmail),
            passwordHash,
            name: encrypt('System'),
            role: 'ADMIN',
            active: true,
        },
    });

    const sarahJones = await prisma.user.upsert({
        where: { emailHash: hash('sarah.jones@accessally.org') },
        update: { passwordHash },
        create: {
            id: 'user-sarah-j-004',
            email: encrypt('sarah.jones@accessally.org'),
            emailHash: hash('sarah.jones@accessally.org'),
            passwordHash,
            name: encrypt('Sarah Jones'),
            username: 'sjones',
            role: 'COORDINATOR',
            active: true,
        },
    });

    console.log('✅ Created users');

    // 2. Create Clients
    // @ts-ignore
    const tcpClient = await prisma.client.upsert({
        where: { name: 'TCP' },
        update: {},
        create: {
            name: 'TCP',
            code: 'TCP',
            active: true,
        }
    });

    console.log('✅ Created clients');

    // Programs and Context Data
    const PROGRAMS = [
        'Gender Blender',
        'Coffee with Queers',
        'Game Night',
        'LO60'
    ];

    const CONDITIONS = [
        'Mobility impairment',
        'Chronic pain',
        'Anxiety',
        'Neurodivergent',
        'Vision impairment',
        'None'
    ];

    const BARRIERS = [
        'Accessing second floor of older house',
        'Navigating narrow hallways',
        'Sensory overload during events',
        'Transportation to venue'
    ];

    // Helper to pick random item
    const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

    // Examiners for Round Robin (Excluding System)
    const examiners = [sarah.id, michael.id, chris.id, sarahJones.id];

    // 3. Create Test Cases (Claimants)
    // Create 10 random cases
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Jamie', 'Skyler', 'Cameron', 'Quinn'];
    const lastNames = ['Smith', 'Johnson', 'Rivera', 'Lee', 'Patel', 'Kim', 'Garcia', 'Martinez', 'Brown', 'Wilson'];

    for (let i = 0; i < 2; i++) {
        try {
            const firstName = pick(firstNames);
            const lastName = pick(lastNames);
            const fullName = `${firstName} ${lastName}`;
            const program = pick(PROGRAMS);
            const barrier = pick(BARRIERS);

            // Round Robin Assignment
            const examinerId = examiners[i % examiners.length];

            // Create a claimant for this case
            const claimantNumber = generateClaimantId();
            const nameHash = hash(fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
            const birthdate = new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
            const pin = Math.floor(Math.random() * 9000 + 1000).toString(); // 4-digit PIN
            const pinHash = await bcrypt.hash(pin, 10);

            const claimant = await prisma.claimant.create({
                data: {
                    claimantNumber,
                    name: encrypt(fullName),
                    nameHash,
                    birthdate,
                    email: encrypt(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`),
                    emailHash: hash(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`),
                    phone: encrypt(`555-01${Math.floor(Math.random() * 90) + 10}`),
                    phoneHash: hash(`555-01${Math.floor(Math.random() * 90) + 10}`),
                    pinHash,
                    credentialType: 'PIN',
                }
            });

            await prisma.case.create({
                data: {
                    title: program,
                    description: `Participant in ${program}. ${barrier}.`,
                    caseNumber: generateCaseNumber('TCP', i + 1),
                    clientName: encrypt(fullName),
                    clientEmail: encrypt(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`),
                    clientEmailHash: hash(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`),
                    clientPhone: encrypt(`555-01${Math.floor(Math.random() * 90) + 10}`),
                    clientBirthdate: birthdate,
                    medicalCondition: pick(CONDITIONS),
                    program: program,
                    category: 'ACCOMMODATION',
                    venue: 'The Center Project (Two Story House)',
                    status: pick(['OPEN', 'IN_PROGRESS', 'PENDING_REVIEW']),
                    priority: Math.floor(Math.random() * 3) + 1, // 1-3
                    // @ts-ignore
                    clientId: tcpClient.id,
                    createdById: examinerId,
                    claimantRef: claimant.id,
                    tasks: {
                        create: {
                            title: 'Initial Case Review',
                            description: `Review accommodation request for ${fullName} in ${program}.`,
                            status: 'PENDING',
                            category: 'FOLLOW_UP',
                            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                            assignedToId: examinerId,
                            createdById: system.id
                        }
                    }
                }
            });
        } catch (err) {
            console.error(`❌ Failed to create case ${i}:`, err);
        }
    }

    // Keep existing demo case
    // Create a claimant for demo case
    const demoClaimant = await prisma.claimant.create({
        data: {
            claimantNumber: generateClaimantId(),
            name: encrypt('Robert Johnson'),
            nameHash: hash('robertjohnson'),
            birthdate: new Date(1985, 5, 15),
            email: encrypt('robert.j@example.com'),
            emailHash: hash('robert.j@example.com'),
            phone: encrypt('555-0199'),
            phoneHash: hash('555-0199'),
            pinHash: await bcrypt.hash('1234', 10),
            credentialType: 'PIN',
        }
    });

    const demoCase = await prisma.case.create({
        data: {
            title: 'Ergonomic Equipment Request',
            description: 'Request for standing desk and ergonomic chair',
            caseNumber: generateCaseNumber('TCP', 999),
            clientName: encrypt('Robert Johnson'),
            clientEmail: encrypt('robert.j@example.com'),
            clientEmailHash: hash('robert.j@example.com'),
            clientBirthdate: new Date(1985, 5, 15),
            status: 'OPEN',
            priority: 2,
            createdById: michael.id,
            // @ts-ignore
            clientId: tcpClient.id,
            claimantRef: demoClaimant.id,
        }
    });

    console.log('✅ Created demo cases');

    // 4. Create Messages
    await prisma.message.createMany({
        data: [
            {
                content: 'Please review the updated policy documents.',
                senderId: sarah.id,
                recipientId: michael.id,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
                read: false,
            },
            {
                content: 'Meeting rescheduled to 3 PM.',
                senderId: sarah.id,
                recipientId: michael.id,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
                read: true,
            },
        ],
    });

    console.log('✅ Created messages');

    // 5. Create Claim Families
    const family = await prisma.claimFamily.create({
        data: {
            name: 'Test Family',
        }
    });

    // Link first two cases to the family
    // Refetch cases to get their IDs (since we created them in a loop)
    const cases = await prisma.case.findMany({ take: 2 });
    if (cases.length >= 2) {
        await prisma.case.update({
            where: { id: cases[0].id },
            data: { claimFamilyId: family.id }
        });
        await prisma.case.update({
            where: { id: cases[1].id },
            data: { claimFamilyId: family.id }
        });
    }

    console.log('✅ Created claim families');

    console.log('🎉 Database seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
