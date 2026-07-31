import { LimitScope, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.operatorSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  await prisma.stakeLimit.upsert({
    where: { scope_referenceId: { scope: LimitScope.GLOBAL, referenceId: "*" } },
    update: {},
    create: {
      scope: LimitScope.GLOBAL,
      referenceId: "*",
      minimumStakeTzs: 500,
      maximumStakeTzs: 2_000_000,
      maximumPayoutTzs: 100_000_000,
      maximumOdds: 1000,
      maximumSelections: 30,
      active: true,
    },
  });
}

main()
  .then(() => console.log("MkwanjaBet production defaults ready."))
  .catch(error => { console.error(error); process.exit(1); })
  .finally(() => prisma.$disconnect());
