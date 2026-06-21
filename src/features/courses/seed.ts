// Corso di esempio nel formato canonico (per dev/test dell'ingestione e del runtime).
// requiredMinutes=1 e somma audioSeconds=80 → supera la validazione monte-ore.

import type { CourseInput } from "./course-format";

export function sampleCourse(): CourseInput {
  return {
    title: "Corso di prova — Sicurezza base",
    description: "Corso di esempio per test del runtime LMS.",
    requiredMinutes: 1,
    modules: [
      {
        title: "Modulo 1",
        lessons: [
          {
            title: "Lezione 1",
            type: "html",
            slides: [
              {
                title: "Introduzione",
                blocks: [
                  { type: "heading", text: "Benvenuto" },
                  { type: "paragraph", text: "Questo è un corso di prova." },
                ],
                speakerNotes: "Benvenuti al corso.",
                avatarClipUid: null,
                audioSeconds: 40,
              },
              {
                title: "Concetti",
                blocks: [{ type: "list", items: ["Punto A", "Punto B"] }],
                speakerNotes: "Vediamo i concetti chiave.",
                avatarClipUid: null,
                audioSeconds: 40,
              },
            ],
            checkpointQuiz: {
              title: "Checkpoint 1",
              questionsToDraw: 1,
              passThreshold: 100,
              timeLimitSeconds: 120,
              cooldownSeconds: 0,
              questions: [
                { text: "2 + 2 = ?", options: [{ id: "a", text: "3" }, { id: "b", text: "4" }], correctOptionId: "b" },
                { text: "Capitale d'Italia?", options: [{ id: "a", text: "Roma" }, { id: "b", text: "Milano" }], correctOptionId: "a" },
              ],
            },
          },
        ],
      },
    ],
    finalExam: {
      title: "Esame finale",
      questionsToDraw: 2,
      passThreshold: 80,
      timeLimitSeconds: 300,
      cooldownSeconds: 60,
      questions: [
        { text: "Domanda 1", options: [{ id: "a", text: "Sì" }, { id: "b", text: "No" }], correctOptionId: "a" },
        { text: "Domanda 2", options: [{ id: "a", text: "Vero" }, { id: "b", text: "Falso" }], correctOptionId: "a" },
        { text: "Domanda 3", options: [{ id: "a", text: "X" }, { id: "b", text: "Y" }], correctOptionId: "b" },
      ],
    },
  };
}
