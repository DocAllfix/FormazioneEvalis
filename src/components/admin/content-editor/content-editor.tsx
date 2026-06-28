"use client";

// Orchestratore dell'editor contenuti: due schede — Struttura (titoli) e Esami & domande
// (config quiz + banca domande). Riceve l'albero già caricato dal server.

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StructureEditor } from "./structure-editor";
import { QuizEditor } from "./quiz-editor";
import type { CourseTree } from "@/features/courses/admin-catalog";

export function ContentEditor({ tree }: { tree: CourseTree }) {
  return (
    <Tabs defaultValue="struttura" className="flex flex-col gap-5">
      <TabsList>
        <TabsTrigger value="struttura">Struttura</TabsTrigger>
        <TabsTrigger value="esami">Esami &amp; domande</TabsTrigger>
      </TabsList>
      <TabsContent value="struttura">
        <StructureEditor modules={tree.modules} />
      </TabsContent>
      <TabsContent value="esami">
        <QuizEditor courseId={tree.id} quizzes={tree.quizzes} />
      </TabsContent>
    </Tabs>
  );
}
