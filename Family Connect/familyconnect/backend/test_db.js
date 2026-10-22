const { PrismaClient } = require('@prisma/client');
const users = ["postgres", "gokul"];
const passwords = [
  "gokul", "gokul123", "gokul@123", "Gokul@123", "gokul1234",
  "root", "admin", "password", "postgres", "password123", "familyconnect",
  "123456", "1234", "admin123", "postgres123", "password1234", "12345",
  "postgrespw", "docker", "system", "manager", ""
];

async function test() {
  for (const u of users) {
    for (const p of passwords) {
      const url = `postgresql://${u}:${p}@localhost:5433/postgres`;
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      try {
        await prisma.$connect();
        console.log(`SUCCESS: User is '${u}', Password is '${p}'`);
        await prisma.$disconnect();
        return;
      } catch (e) {
        // ignore errors
      }
    }
  }
  console.log("ALL PASSED PASSWORDS FAILED");
}
test();
