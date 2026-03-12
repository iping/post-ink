/**
 * Generate a unique 6-digit numeric string for use as primary key (Customer, Project, Session).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {'customer'|'project'|'session'} model
 * @param {number} length
 * @returns {Promise<string>}
 */
export async function generateNumericId(prisma, model, length = 6) {
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    const id = String(Math.floor(Math.random() * (max - min + 1)) + min);
    const existing = await prisma[model].findUnique({ where: { id } }).catch(() => null);
    if (!existing) return id;
  }
  throw new Error(`Could not generate unique ${length}-digit id for ${model}`);
}
