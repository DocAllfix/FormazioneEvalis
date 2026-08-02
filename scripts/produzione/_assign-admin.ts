import "dotenv/config";
import { enrollMemberInCourse } from "@/features/courses/assign";
const ORG = "8804070c-d00b-41ee-a046-ea15af6343e2"; // acme-test
const ADMIN = "gJJGq3cwwg7LvgGi2f5EfdvjZYNRwpSu"; // gigioale1501@gmail.com (owner)
const COURSES = [
  { id: "79d362cc-487d-42c1-9ce7-ca868fe6e909", n: "ISO 19011" },
  { id: "7f149a45-a5d2-4226-a07c-17434c493fa8", n: "ISO 9001" },
];
for (const c of COURSES) {
  const r = await enrollMemberInCourse({ orgId: ORG, memberUserId: ADMIN, courseId: c.id });
  console.log(`assegnato ${c.n}:`, r.ok ? "OK" : r);
}
process.exit(0);
