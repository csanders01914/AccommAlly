
const { PrismaClient } = require('@prisma/client');

// Need to handle async in script
async function main() {
    const prisma = new PrismaClient();

    // Get transaction ID from args
    const transactionId = process.argv[2];

    if (!transactionId) {
        console.error('Usage: npm run trace <transaction-id>');
        process.exit(1);
    }

    console.log(`\n🔍 Tracing Transaction ID: ${transactionId}...\n`);

    try {
        const errorLog = await prisma.errorLog.findUnique({
            where: { transactionId },
            include: { user: { select: { name: true, email: true } } }
        });

        if (!errorLog) {
            console.error('❌ Error Log not found for this Transaction ID.');
            process.exit(1);
        }

        console.log('---------------------------------------------------');
        console.log(`🕒 Timestamp: ${errorLog.timestamp.toLocaleString()}`);
        console.log(`👤 User:      ${errorLog.user ? `${errorLog.user.name} (${errorLog.user.email})` : 'Anonymous/System'}`);
        console.log(`📍 Path:      ${errorLog.method || '?'} ${errorLog.path || '?'}`);
        console.log(`🔢 Status:    ${errorLog.statusCode}`);
        console.log('---------------------------------------------------');
        console.log(`\n🚨 MESSAGE:\n${errorLog.message}\n`);

        if (errorLog.metadata) {
            console.log(`📦 METADATA:\n${JSON.stringify(errorLog.metadata, null, 2)}\n`);
        }

        console.log(`📚 STACK TRACE:\n${errorLog.stack || 'No stack trace available'}`);
        console.log('---------------------------------------------------');

    } catch (e) {
        console.error('Failed to trace error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
