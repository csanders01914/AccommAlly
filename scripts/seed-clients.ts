
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    let tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-tenant' } })
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Demo Organization',
                slug: 'demo-tenant',
                status: 'ACTIVE',
                plan: 'ENTERPRISE'
            }
        })
    }

    const tcp = await prisma.client.upsert({
        where: { name: 'TCP' },
        update: {},
        create: {
            name: 'TCP',
            code: 'TCP',
            tenantId: tenant.id
        }
    })
    console.log({ tcp })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
