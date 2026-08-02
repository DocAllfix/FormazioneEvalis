import "dotenv/config";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { slide } from "@/lib/db/schema";
const [s] = await db.select({ id: slide.id }).from(slide).orderBy(asc(slide.id)).limit(1);
console.log(s?.id ?? "(nessuna slide)");
process.exit(0);
