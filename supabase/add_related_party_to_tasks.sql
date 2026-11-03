-- Migration: add related_party column to tasks table
-- This allows users to specify which party (client/author/defendant) a task refers to

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS related_party TEXT;

COMMENT ON COLUMN tasks.related_party IS 'Nome da parte do processo à qual esta tarefa está relacionada (ex: autor, réu, interveniente). Opcional.';
