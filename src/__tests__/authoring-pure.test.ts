// Authoring (logica pura): validazione manifest, raccolta clipKey, resolver → CourseInput
// compatibile con l'ingest. Nessun DB.

import { describe, it, expect } from "vitest";
import {
  courseManifestSchema,
  collectClipKeys,
  resolveManifestToCourse,
} from "../features/courses/authoring-manifest";
import { courseInputSchema } from "../features/courses/course-format";

const goodManifest = {
  title: "Corso X",
  requiredMinutes: 1,
  modules: [
    {
      title: "M1",
      lessons: [
        {
          title: "L1",
          slides: [
            { title: "S1", html: "<section>a</section>", clipKey: "s01" },
            { title: "S2", html: "<section>b</section>", clipKey: "s02" },
          ],
          checkpointQuiz: {
            title: "CP",
            questionsToDraw: 1,
            passThreshold: 80,
            timeLimitSeconds: 60,
            questions: [
              { text: "q?", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctOptionId: "a" },
            ],
          },
        },
      ],
    },
  ],
};

describe("authoring manifest", () => {
  it("valida un manifest corretto", () => {
    expect(courseManifestSchema.safeParse(goodManifest).success).toBe(true);
  });

  it("rifiuta html vuoto", () => {
    const bad = structuredClone(goodManifest);
    bad.modules[0].lessons[0].slides[0].html = "";
    expect(courseManifestSchema.safeParse(bad).success).toBe(false);
  });

  it("rifiuta questionsToDraw oltre la banca domande", () => {
    const bad = structuredClone(goodManifest);
    bad.modules[0].lessons[0].checkpointQuiz.questionsToDraw = 5;
    expect(courseManifestSchema.safeParse(bad).success).toBe(false);
  });

  it("collectClipKeys ritorna le chiavi uniche", () => {
    const m = courseManifestSchema.parse(goodManifest);
    expect(collectClipKeys(m).sort()).toEqual(["s01", "s02"]);
  });

  it("resolveManifestToCourse mappa uid+durata e produce un CourseInput valido per l'ingest", () => {
    const m = courseManifestSchema.parse(goodManifest);
    const clipMap = { s01: { uid: "uidA", duration: 40 }, s02: { uid: "uidB", duration: 35 } };
    const course = resolveManifestToCourse(m, clipMap);
    expect(courseInputSchema.safeParse(course).success).toBe(true); // contratto ingest rispettato
    const slide0 = course.modules[0].lessons[0].slides[0];
    expect(slide0.avatarClipUid).toBe("uidA");
    expect(slide0.audioSeconds).toBe(40);
    expect(slide0.blocks[0]).toEqual({ type: "html", html: "<section>a</section>" });
  });

  it("resolveManifestToCourse lancia se manca una clip", () => {
    const m = courseManifestSchema.parse(goodManifest);
    expect(() => resolveManifestToCourse(m, { s01: { uid: "x", duration: 10 } })).toThrow(/Clip mancante/);
  });
});
