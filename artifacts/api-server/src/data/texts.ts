import type { SelectedText } from "./types";

// Други део збирке: одабрани текстови који служе као основа за низ задатака.
// Задатак се везује за текст преко `textKey`, а не преко редног броја текста —
// редни број се мења кад се текст дода или уклони, а кључ остаје.

export const texts: SelectedText[] = [];

const byKey = new Map(texts.map((t) => [t.key, t]));

export const textByKey = (key: string): SelectedText | undefined => byKey.get(key);
