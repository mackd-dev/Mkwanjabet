import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const demoEventSlugs = [
  "young-africans-vs-azam-sportsbook",
  "arsenal-vs-chelsea-sportsbook",
  "real-madrid-vs-bayern-sportsbook",
];

async function main() {
  const events = await prisma.event.deleteMany({ where: { slug: { in: demoEventSlugs } } });
  const user = await prisma.user.deleteMany({
    where: {
      phone: "+255700000001",
      email: "demo@mkwanjabet.co.tz",
      name: "MkwanjaBet Demo",
      bets: { none: {} },
      wallet: { is: null },
    },
  });
  console.log(JSON.stringify({ removedDemoEvents: events.count, removedUnusedDemoUsers: user.count }));
}

main().catch(error => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
