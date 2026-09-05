import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("quiz_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordPlain: text("password_plain").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("student"),
  active: boolean("active").notNull().default(true),
  neverExpires: boolean("never_expires").notNull().default(true),
  quizOnce: boolean("quiz_once").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  /**
   * NULL = вежбање из збирке. Кад стоји кључ теста, покушај је са завршног
   * испита из претходних година. Вежбање и испит се не мешају ни на једном
   * прегледу: бодовање им је различито (0/1 по задатку наспram делимичних
   * поена), па је просек преко оба бесмислен.
   */
  examKey: text("exam_key"),

  /** Ниво и област важе само за вежбање; за испит остају NULL. */
  level: text("level"),
  area: text("area"),

  score: integer("score").notNull(),
  total: integer("total").notNull(),
  percentage: integer("percentage").notNull(),
  passed: boolean("passed").notNull(),

  /** Поени са испита; допуштају половине, па не могу бити integer. */
  pointsEarned: numeric("points_earned", { precision: 6, scale: 2 }),
  pointsTotal: numeric("points_total", { precision: 6, scale: 2 }),

  answers: jsonb("answers").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
