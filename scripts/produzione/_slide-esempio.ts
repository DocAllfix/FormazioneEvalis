import "dotenv/config";
import { db } from "@/lib/db";
import { slide } from "@/lib/db/schema";
import { isNotNull } from "drizzle-orm";
const r = await db.select({ id: slide.id, t: slide.title, clip: slide.avatarClipUid }).from(slide).where(isNotNull(slide.avatarClipUid)).limit(1);
console.log(JSON.stringify(r[0]));
process.exit(0);
