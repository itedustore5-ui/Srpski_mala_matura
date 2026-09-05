-- Прилагођавање покушаја структури збирке из српског језика.
--
-- Миграција је идемпотентна и не зависи од редоследа: свака измена стоји уз
-- IF NOT EXISTS. Разлог је што се база на серверу за наставу и база за развој
-- не поклапају увек, па се миграције тамо примењују у различитом тренутку.

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS exam_key text;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS points_earned numeric(6, 2);
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS points_total numeric(6, 2);

-- Преглед напретка увек филтрира вежбање по нивоу и области, а листа испита по
-- кључу теста. Без индекса ти упити пролазе кроз целу табелу.
CREATE INDEX IF NOT EXISTS quiz_attempts_practice_idx
  ON quiz_attempts (user_id, level, area)
  WHERE exam_key IS NULL;

CREATE INDEX IF NOT EXISTS quiz_attempts_exam_idx
  ON quiz_attempts (user_id, exam_key)
  WHERE exam_key IS NOT NULL;
