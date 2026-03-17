import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const studios = await prisma.tattooStudio.findMany({
    select: { id: true, name: true },
  });
  if (studios.length === 0) {
    console.log('No studios found. Nothing to attach.');
    return;
  }

  const customers = await prisma.customer.findMany({
    include: { studioCustomers: true },
  });

  let updated = 0;
  for (const customer of customers) {
    if (customer.studioCustomers && customer.studioCustomers.length > 0) continue;
    // Pick a random studio to own this record
    const studio = studios[Math.floor(Math.random() * studios.length)];
    await prisma.studioCustomer.create({
      data: {
        studioId: studio.id,
        customerId: customer.id,
      },
    });
    updated += 1;
  }

  console.log(`Attached ${updated} customers/leads to a random studio.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

