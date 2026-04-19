
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Seeding subscription plans...');

    const plans = [
        { code: 'FREE', name: 'Free', maxUsers: 5, maxActiveClaims: 10 },
        { code: 'STARTER', name: 'Starter', maxUsers: 10, maxActiveClaims: 50 },
        { code: 'PRO', name: 'Professional', maxUsers: 50, maxActiveClaims: 500 },
        { code: 'ENTERPRISE', name: 'Enterprise', maxUsers: -1, maxActiveClaims: -1 },
    ];

    for (const plan of plans) {
        await prisma.subscriptionPlan.upsert({
            where: { code: plan.code },
            update: {
                name: plan.name,
                maxUsers: plan.maxUsers,
                maxActiveClaims: plan.maxActiveClaims,
            },
            create: plan,
        });
        console.log(`- Upserted plan: ${plan.name} (${plan.code})`);
    }

    console.log('Linking existing tenants to plans...');

    // Link tenants that don't have a planId yet based on their plan string
    const tenants = await prisma.tenant.findMany({
        where: { planId: null },
    });

    for (const tenant of tenants) {
        const planCode = tenant.plan || 'FREE';
        const plan = await prisma.subscriptionPlan.findUnique({
            where: { code: planCode },
        });

        if (plan) {
            await prisma.tenant.update({
                where: { id: tenant.id },
                data: { planId: plan.id },
            });
            console.log(`- Linked tenant ${tenant.name} to plan ${plan.name}`);
        } else {
            // Fallback to FREE if plan code not found
            const freePlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'FREE' } });
            if (freePlan) {
                await prisma.tenant.update({
                    where: { id: tenant.id },
                    data: { planId: freePlan.id, plan: 'FREE' },
                });
                console.log(`- Linked tenant ${tenant.name} to fallback plan FREE`);
            }
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
