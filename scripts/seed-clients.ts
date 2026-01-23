
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const tcp = await prisma.client.upsert({
        where: { name: 'TCP' },
        update: {},
        create: {
            name: 'TCP',
            code: 'TCP'
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
