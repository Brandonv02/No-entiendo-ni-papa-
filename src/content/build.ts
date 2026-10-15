import type { DialogLine, Lesson, Level, Phrase, Unit, Vocab } from "@/lib/types";

/** [inglés, español, nota?] */
export type V = [string, string, string?];
/** [inglés, español, hueco?, distractores?, extras?] */
export type P = [string, string, string?, string[]?, { alt?: string[]; literal?: string; note?: string }?];

interface LessonDef {
  title: string;
  objective: string;
  vocab: V[];
  phrases: P[];
  grammar: { title: string; points: string[]; example?: string };
  writing: { prompt: string; hint: string; sample: string; keywords: string[] };
  dialog?: Array<[string, string, string]>;
}

export function unit(
  number: number,
  level: Level,
  title: string,
  emoji: string,
  blurb: string,
  lessons: LessonDef[],
): Unit {
  const uid = `u${number}`;
  return {
    id: uid,
    number,
    level,
    title,
    emoji,
    blurb,
    lessons: lessons.map((d, i): Lesson => {
      const id = `${uid}l${i + 1}`;
      const vocab: Vocab[] = d.vocab.map(([en, es, note], k) => ({ id: `${id}v${k + 1}`, en, es, ...(note ? { note } : {}) }));
      const phrases: Phrase[] = d.phrases.map(([en, es, blank, dis, x], k) => ({
        id: `${id}p${k + 1}`,
        en,
        es,
        ...(blank ? { blank } : {}),
        ...(dis ? { blankDistractors: dis } : {}),
        ...(x?.alt ? { altEn: x.alt } : {}),
        ...(x?.literal ? { literal: x.literal } : {}),
        ...(x?.note ? { note: x.note } : {}),
      }));
      const dialog: DialogLine[] | undefined = d.dialog?.map(([speaker, en, es]) => ({ speaker, en, es }));
      return {
        id,
        unitId: uid,
        title: d.title,
        objective: d.objective,
        vocab,
        phrases,
        grammar: d.grammar,
        writing: d.writing,
        speaking: phrases.slice(0, 3).map((p) => p.id),
        ...(dialog ? { dialog } : {}),
      };
    }),
  };
}
