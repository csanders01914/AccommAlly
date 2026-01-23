
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { encryptionExtension } from '../src/lib/prisma-extension';

// Initialize Prisma with extension
const prisma = new PrismaClient().$extends(encryptionExtension);

async function main() {
    console.log('Starting verification of Case Refactor...');

    const timestamp = Date.now();
    const testCaseNumber = `TEST-${timestamp}`;

    try {
        console.log('Creating test case...');
        const newCase = await prisma.case.create({
            data: {
                caseNumber: testCaseNumber,
                claimantId: `CLM-${timestamp}`,
                clientName: 'Test Client',
                clientEmail: 'test@example.com',
                clientPhone: '555-0100',
                title: 'Refactor Verification Case',
                // The fields we care about:
                description: 'Original Description Text',
                medicalCondition: 'Severe Back Pain', // Should be encrypted in DB
                program: 'Vocational Rehab',
                venue: 'Remote',
                preferredStartDate: '2025-02-01',

                status: 'OPEN',
                priority: 1,
                createdById: 'system-id-placeholder' // We might need a real user ID if FK constraint exists
            }
        });

        console.log(`Case created with ID: ${newCase.id}`);

        // Read back using Prisma (should decrypt automatically)
        const fetchedCase = await prisma.case.findUnique({
            where: { id: newCase.id }
        });

        if (!fetchedCase) {
            console.error('FAILED: Could not fetch created case.');
            return;
        }

        console.log('--- Verification Results ---');
        console.log(`Medical Condition (Decrypted): "${fetchedCase.medicalCondition}"`);
        console.log(`Preferred Start Date: "${fetchedCase.preferredStartDate}"`);
        console.log(`Description: "${fetchedCase.description}"`);

        // Assertions
        let success = true;
        if (fetchedCase.medicalCondition !== 'Severe Back Pain') {
            console.error('FAIL: Medical Condition mismatch.');
            success = false;
        }
        if (fetchedCase.preferredStartDate !== '2025-02-01') {
            console.error('FAIL: Start Date mismatch.');
            success = false;
        }
        if (fetchedCase.description !== 'Original Description Text') {
            console.error('FAIL: Description is polluted (maybe concatenation?).');
            success = false;
        }

        if (success) {
            console.log('SUCCESS: All fields verified correctly.');
        } else {
            console.error('OVERALL FAILURE.');
        }

        // Cleanup
        console.log('Cleaning up test case...');
        await prisma.case.delete({ where: { id: newCase.id } });

    } catch (error) {
        console.error('Error during verification:', error);
        // Might fail on foreign key 'createdById' if we don't have a valid user.
        // Let's try to find a user first if it fails.
    }
}

// Check for user existence helper
async function ensureUserAndRun() {
    const rawPrisma = new PrismaClient(); // use raw client to find user
    const user = await rawPrisma.user.findFirst();
    if (user) {
        // We can't easily pass this user ID to the main function if we need to modify the create call there,
        // but wait, the create call uses 'system-id-placeholder'.
        // We should fetch a valid user ID first.

        console.log(`Found existing user: ${user.id}, using for creator.`);

        // Monkey-patch the create call arguments? No, just rewrite logic inside main or pass it.
        // Actually, main() has hardcoded ID.
        // Let's just update main to fetch user first.
    }
}

// Redefine main to be smarter
async function reliableMain() {
    console.log('Starting verification...');
    const rawPrisma = new PrismaClient();
    const user = await rawPrisma.user.findFirst();
    await rawPrisma.$disconnect();

    if (!user) {
        console.error('No users found in DB. Cannot create case without creator.');
        return;
    }

    const timestamp = Date.now();
    const testCaseNumber = `TEST-${timestamp}`;

    try {
        const newCase = await prisma.case.create({
            data: {
                caseNumber: testCaseNumber,
                claimantId: `CLM-${timestamp}`,
                clientName: 'Test Client',
                title: 'Refactor Verification Case',
                description: 'Original Description Text',
                medicalCondition: 'Severe Back Pain',
                program: 'Vocational Rehab',
                venue: 'Remote',
                preferredStartDate: '2025-02-01',
                status: 'OPEN',
                priority: 1,
                createdById: user.id
            }
        });

        console.log(`Case created with ID: ${newCase.id}`);

        const fetchedCase = await prisma.case.findUnique({
            where: { id: newCase.id }
        });

        console.log('--- Verification Results ---');
        console.log(`Medical Condition: "${fetchedCase?.medicalCondition}"`);
        console.log(`Start Date: "${fetchedCase?.preferredStartDate}"`);
        console.log(`Description: "${fetchedCase?.description}"`);

        if (fetchedCase?.medicalCondition === 'Severe Back Pain' &&
            fetchedCase?.preferredStartDate === '2025-02-01' &&
            fetchedCase?.description === 'Original Description Text') {
            console.log('SUCCESS: All fields verified.');
        } else {
            console.error('FAILURE: Mismatch.');
        }

        await prisma.case.delete({ where: { id: newCase.id } });

    } catch (e) {
        console.error('Error:', e);
    }
}

reliableMain();
