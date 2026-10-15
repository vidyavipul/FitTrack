-- Exercises get an owner. Built-in (seeded) exercises have none and are read-only;
-- users can only change or delete exercises they added themselves.
-- Also stop a catalog delete from cascading into users' logged sets.
USE fittrack_db;

ALTER TABLE exercises
    ADD COLUMN created_by INT NULL,
    ADD CONSTRAINT fk_exercises_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE workout_sets DROP FOREIGN KEY workout_sets_ibfk_2;
ALTER TABLE workout_sets
    ADD CONSTRAINT workout_sets_ibfk_2
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;
