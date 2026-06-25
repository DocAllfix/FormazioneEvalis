// Cluster B — Catalogo & Fruizione (ARCHITETTURA.md §3) [BUILD]
//
// Gerarchia: course -> module -> lesson. enrollment lega utente+org+corso.
// lesson_progress tiene i secondi validati lato server (antifrode).
// Ogni record di dominio porta organization_id (scoping multi-tenant).
//
// Nota cross-cluster: organizationId / userId referenziano le tabelle generate
// da better-auth (organization.id / user.id, di tipo text). Per non accoppiare
// questo file allo schema generato, sono colonne `text` indicizzate (soft FK).

import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uuid,
  index,
  unique,
} from "drizzle-orm/pg-core";

// --- Enum ---
export const courseStatus = pgEnum("course_status", [
  "draft",
  "published",
  "archived",
]);

export const activityType = pgEnum("activity_type", [
  "html",
  "video",
  "scorm",
  "document",
]);

export const quizType = pgEnum("quiz_type", ["checkpoint", "final"]);

export const enrollmentSource = pgEnum("enrollment_source", [
  "b2b_seat",
  "b2c_purchase",
  "manual", // usato nel prototipo (accesso concesso senza pagamento)
]);

export const enrollmentStatus = pgEnum("enrollment_status", [
  "active",
  "expired",
  "revoked",
]);

// --- Course ---
export const course = pgTable(
  "course",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = catalogo globale (assegnabile a qualsiasi org); valorizzato = corso proprio di un'org
    organizationId: text("organization_id"),
    title: text("title").notNull(),
    description: text("description"),
    durationHours: integer("duration_hours"),
    // Monte ore legale del tipo corso (Accordo): la fruizione deve raggiungerlo.
    requiredMinutes: integer("required_minutes").notNull().default(0),
    // Slug SEO-friendly per la pagina pubblica teaser (/corso/[slug]). Unico.
    slug: text("slug").unique(),
    // Categoria per il filtro del catalogo (es. auditor/mestieri/bancario). null = nessuna.
    category: text("category"),
    // Contenuti descrittivi opzionali della scheda (catalogo post-login), in UN jsonb ordinato.
    details: jsonb("details").$type<{
      audience?: string;
      objectives?: string[];
      level?: string;
      language?: string;
      certInfo?: string;
    }>(),
    // URL pubblico immagine corso (bucket Supabase "course-images"); null = grafica per categoria.
    imageUrl: text("image_url"),
    // Prezzo Stripe per l'acquisto one-off B2C (Modulo 2); null = non acquistabile singolarmente.
    stripePriceId: text("stripe_price_id"),
    // Prezzo denormalizzato per la VETRINA (display); il checkout usa stripePriceId.
    priceCents: integer("price_cents"),
    currency: text("currency").default("eur"),
    status: courseStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("course_org_idx").on(t.organizationId)],
);

// --- Module ---
export const module = pgTable(
  "module",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("module_course_idx").on(t.courseId)],
);

// --- Lesson ---
export const lesson = pgTable(
  "lesson",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => module.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    activityType: activityType("activity_type").notNull().default("video"),
    // Riferimento al video presso il provider (Cloudflare Stream UID) o pacchetto SCORM
    videoUid: text("video_uid"),
    // Tempo minimo di fruizione verificato lato server (vincolo Accordo 2025)
    minRequiredSeconds: integer("min_required_seconds").notNull().default(0),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lesson_module_idx").on(t.moduleId)],
);

// --- Slide (lezione html: unità didattica, base del tracciamento per-unità) ---
export const slide = pgTable(
  "slide",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    title: text("title").notNull(),
    // contenuto strutturato a blocchi [{ type, ... }] — renderizzato dal frontend
    blocks: jsonb("blocks").notNull(),
    // clip avatar (Cloudflare Stream UID); null = slide senza avatar
    avatarClipUid: text("avatar_clip_uid"),
    // durata narrazione/clip (secondi) -> guida il tempo minimo della slide
    audioSeconds: integer("audio_seconds").notNull().default(0),
    speakerNotes: text("speaker_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("slide_lesson_idx").on(t.lessonId)],
);

// --- Quiz (checkpoint intermedio obbligatorio | esame finale) ---
export const quiz = pgTable(
  "quiz",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    type: quizType("type").notNull(),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    questionsToDraw: integer("questions_to_draw").notNull().default(1),
    passThreshold: integer("pass_threshold").notNull().default(80), // %
    timeLimitSeconds: integer("time_limit_seconds").notNull().default(0),
    cooldownSeconds: integer("cooldown_seconds").notNull().default(0),
    maxAttempts: integer("max_attempts"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quiz_course_idx").on(t.courseId)],
);

// --- Enrollment ---
export const enrollment = pgTable(
  "enrollment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    source: enrollmentSource("source").notNull().default("manual"),
    status: enrollmentStatus("status").notNull().default("active"),
    // null = nessuna scadenza (default prototipo); valorizzato per accesso a tempo (B2C)
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("enrollment_org_idx").on(t.organizationId),
    index("enrollment_user_idx").on(t.userId),
    unique("enrollment_user_course_uq").on(t.userId, t.courseId),
  ],
);

// --- Lesson progress (server-authoritative) ---
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollment.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    // Secondi effettivi validati dal server (incrementati solo se condizioni antifrode ok)
    effectiveWatchSeconds: integer("effective_watch_seconds").notNull().default(0),
    // Massimo timestamp "validato" raggiunto (per il blocco seek in avanti)
    maxValidatedSeconds: integer("max_validated_seconds").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("progress_enrollment_lesson_uq").on(t.enrollmentId, t.lessonId)],
);

// --- Slide progress (server-authoritative, per-unità — requisito Accordo) ---
export const slideProgress = pgTable(
  "slide_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollment.id, { onDelete: "cascade" }),
    slideId: uuid("slide_id")
      .notNull()
      .references(() => slide.id, { onDelete: "cascade" }),
    // secondi effettivi validati dal server (solo playing+visibile+no-salto)
    effectiveSeconds: integer("effective_seconds").notNull().default(0),
    audioCompleted: boolean("audio_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("slide_progress_enrollment_slide_uq").on(t.enrollmentId, t.slideId)],
);

// --- Quiz: banca domande ---
export const quizQuestion = pgTable(
  "quiz_question",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    // banca di appartenenza (checkpoint o esame finale)
    quizId: uuid("quiz_id").references(() => quiz.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    // opzioni come array JSON [{ id, text }]
    options: jsonb("options").notNull(),
    correctOptionId: text("correct_option_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quiz_question_course_idx").on(t.courseId),
    index("quiz_question_quiz_idx").on(t.quizId),
  ],
);

// --- Quiz: tentativi ---
export const quizAttempt = pgTable(
  "quiz_attempt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollment.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id").references(() => quiz.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(0),
    passed: boolean("passed").notNull().default(false),
    // finestra di tempo del tentativo (per il limite di tempo, validato lato server)
    startedAt: timestamp("started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    // blocco temporale dopo tentativi falliti (cooldown)
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    // dettaglio: domande estratte, risposte date, tempi
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quiz_attempt_enrollment_idx").on(t.enrollmentId)],
);
