// Dev helper one-off: stampa il verifyUuid del certificato di un utente.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { certificate, enrollment, user } from "@/lib/db/schema";

const email = process.argv[2] ?? "discente.demo@evalis.test";
const [row] = await db
  .select({ uuid: certificate.verifyUuid, status: certificate.status })
  .from(certificate)
  .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
  .innerJoin(user, eq(user.id, enrollment.userId))
  .where(eq(user.email, email))
  .limit(1);
console.log(JSON.stringify(row ?? null));
process.exit(0);
