import type { Question } from "../types";
import { osnovniCitanje } from "./osnovni-citanje";
import { osnovniPisanje } from "./osnovni-pisanje";
import { osnovniGramatika } from "./osnovni-gramatika";
import { osnovniKnjizevnost } from "./osnovni-knjizevnost";
import { srednjiCitanje } from "./srednji-citanje";
import { srednjiPisanje } from "./srednji-pisanje";
import { srednjiGramatika } from "./srednji-gramatika";
import { srednjiKnjizevnost } from "./srednji-knjizevnost";
import { napredniCitanje } from "./napredni-citanje";
import { napredniPisanje } from "./napredni-pisanje";
import { napredniGramatika } from "./napredni-gramatika";
import { napredniKnjizevnost } from "./napredni-knjizevnost";
import { drugiDeo } from "./drugi-deo";

// Редослед прати збирку: први део иде ниво по ниво, а у сваком нивоу четири
// области истим редом; други део су задаци уз одабране текстове.
export const questions: Question[] = [
  ...osnovniCitanje,
  ...osnovniPisanje,
  ...osnovniGramatika,
  ...osnovniKnjizevnost,
  ...srednjiCitanje,
  ...srednjiPisanje,
  ...srednjiGramatika,
  ...srednjiKnjizevnost,
  ...napredniCitanje,
  ...napredniPisanje,
  ...napredniGramatika,
  ...napredniKnjizevnost,
  ...drugiDeo,
];

const byId = new Map(questions.map((q) => [q.id, q]));

/**
 * Задатак се тражи по броју, никад по позицији у низу.
 * Позиција се мења при сваком допуњавању збирке, а број задатка је оно што је
 * уписано у већ сачуваним покушајима — тражење по позицији би им променило
 * значење уназад.
 */
export const questionById = (id: number): Question | undefined => byId.get(id);

export type { Question };
