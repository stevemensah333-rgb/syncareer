-- Drop unused tables (Learn module removed; user_stats/skill_question_bank/unmapped_skills_log never queried)
DROP TABLE IF EXISTS public.learning_activities CASCADE;
DROP TABLE IF EXISTS public.learning_streaks CASCADE;
DROP TABLE IF EXISTS public.learning_module_completions CASCADE;
DROP TABLE IF EXISTS public.learning_goals CASCADE;
DROP TABLE IF EXISTS public.learning_paths CASCADE;
DROP TABLE IF EXISTS public.user_course_progress CASCADE;
DROP TABLE IF EXISTS public.cached_free_resources CASCADE;
DROP TABLE IF EXISTS public.user_stats CASCADE;
DROP TABLE IF EXISTS public.skill_question_bank CASCADE;
DROP TABLE IF EXISTS public.unmapped_skills_log CASCADE;

-- Drop orphaned functions that only served the removed tables
DROP FUNCTION IF EXISTS public.update_learning_streak() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_stats() CASCADE;
DROP FUNCTION IF EXISTS public.migrate_skills_to_relational() CASCADE;