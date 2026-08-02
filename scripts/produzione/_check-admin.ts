import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
const [u] = await db.select().from(user).where(eq(user.id, "UDehVYvTyFwHEBmVH1rWQwvLU5yjEF40")).limit(1);
console.log("account:", u?.email, "| platformRole:", (u as Record<string, unknown>)?.platformRole ?? "(nessuno)");
console.log("PLATFORM_STAFF_EMAILS presente:", !!process.env.PLATFORM_STAFF_EMAILS);
process.exit(0);
