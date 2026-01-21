
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../../.env' }); // Adjust path to root .env

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            take: 5,
            select: { email: true, role: true }
        });
        console.log('Users:', JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
