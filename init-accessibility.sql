-- Data of the RGAA states of rgaa.yaml (MAIR-316), loaded by the seeder-a11y service of
-- docker-compose-accessibility.yml only, after init-test.sql (user 2). The ZAP / k6 stacks keep
-- the minimal seed. Ids start at 10 (users), 101 (projects) and 1001 (tasks) so that they never
-- clash with init-test.sql nor with the rows a writing state creates (sequences moved past them).
-- Fixed dates only: the browser clock of the engine is fixed at 2026-01-15.
--
-- Project API 0.5.1 shows a project to its owner and its members (all of them for Admin / Maire);
-- BFF_Project 0.4.0 maps projects.status (active -> in-progress, suspended -> review,
-- completed -> done, anything else -> todo), derives the priority and the due date of a project
-- from its tasks, and only lets Admin / Maire / Responsable manage projects.
BEGIN;

-- Users. Every user needs a user_roles row (core-api answers 502 otherwise); inserted in the same
-- transaction as the user, so the deferred default-role trigger does not add Guest.
--   10 manager  (Responsable): owns the projects of the board, every non-mutating state
--   11 creator  (Responsable): owns project 111, only for the duplicate state (writes)
--   12 newcomer (User): no project, empty board
INSERT INTO users (id, first_name, last_name, email, password, status) VALUES
    (10, 'Claire', 'Martin', 'rgaa-manager@mairie360.fr', 'dummy', 'active'),
    (11, 'Paul', 'Bernard', 'rgaa-creator@mairie360.fr', 'dummy', 'active'),
    (12, 'Léa', 'Petit', 'rgaa-newcomer@mairie360.fr', 'dummy', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM (VALUES (10, 'Responsable'), (11, 'Responsable'), (12, 'User')) AS u(id, role)
JOIN roles r ON r.name = u.role
ON CONFLICT DO NOTHING;

-- Projects of the manager, one per column of the board. User 2 (role User) is a member of 101
-- and 102, so the agent states show a read-only board.
INSERT INTO projects (id, title, description, status, owner_id, responsible_id, priority, due_date, labels, created_at) VALUES
    (101, 'Rénovation de l''école Jules Ferry', 'Mise aux normes énergétiques et accessibilité des salles de classe.', 'active', 10, 10, 'high', DATE '2026-03-31', ARRAY['Travaux', 'Éducation'], TIMESTAMP '2025-11-03 09:00:00'),
    (102, 'Plan de mobilité douce', 'Pistes cyclables et stationnement vélo autour de la mairie.', 'todo', 10, 10, 'medium', DATE '2026-06-30', ARRAY['Voirie'], TIMESTAMP '2025-11-10 09:00:00'),
    (103, 'Budget participatif 2026', 'Recueil et vote des propositions des habitants.', 'suspended', 10, 10, 'low', DATE '2026-02-28', ARRAY['Citoyenneté'], TIMESTAMP '2025-10-01 09:00:00'),
    (104, 'Fleurissement du centre-ville', 'Plantations de printemps des places et des ronds-points.', 'completed', 10, 10, 'medium', DATE '2025-12-15', ARRAY['Espaces verts'], TIMESTAMP '2025-09-15 09:00:00'),
    (111, 'Marché de Noël', 'Organisation des chalets et des animations de décembre.', 'active', 11, 11, 'medium', DATE '2026-12-01', ARRAY['Événement'], TIMESTAMP '2025-11-20 09:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_members (project_id, user_id) VALUES
    (101, 10), (101, 2),
    (102, 10), (102, 2),
    (103, 10),
    (104, 10),
    (111, 11)
ON CONFLICT DO NOTHING;

-- Tasks: they give each project its priority, due date and progress.
INSERT INTO tasks (id, project_id, title, status, priority, due_date, assigned_to, created_at, updated_at) VALUES
    (1001, 101, 'Diagnostic énergétique', 'completed', 'high', TIMESTAMP '2026-01-10 12:00:00', 10, TIMESTAMP '2025-11-03 09:00:00', TIMESTAMP '2025-12-01 09:00:00'),
    (1002, 101, 'Remplacement des fenêtres', 'in_progress', 'high', TIMESTAMP '2026-02-20 12:00:00', 2, TIMESTAMP '2025-11-03 09:00:00', TIMESTAMP '2025-12-01 09:00:00'),
    (1003, 101, 'Rampe d''accès au préau', 'todo', 'medium', TIMESTAMP '2026-03-31 12:00:00', 10, TIMESTAMP '2025-11-03 09:00:00', TIMESTAMP '2025-12-01 09:00:00'),
    (1004, 102, 'Relevé des itinéraires', 'todo', 'medium', TIMESTAMP '2026-04-15 12:00:00', 10, TIMESTAMP '2025-11-10 09:00:00', TIMESTAMP '2025-12-01 09:00:00'),
    (1005, 103, 'Appel à propositions', 'in_progress', 'low', TIMESTAMP '2026-02-28 12:00:00', 10, TIMESTAMP '2025-10-01 09:00:00', TIMESTAMP '2025-12-01 09:00:00'),
    (1006, 104, 'Commande des plants', 'completed', 'medium', TIMESTAMP '2025-11-30 12:00:00', 10, TIMESTAMP '2025-09-15 09:00:00', TIMESTAMP '2025-12-01 09:00:00'),
    (1007, 104, 'Plantations', 'completed', 'medium', TIMESTAMP '2025-12-15 12:00:00', 10, TIMESTAMP '2025-09-15 09:00:00', TIMESTAMP '2025-12-01 09:00:00'),
    (1011, 111, 'Réservation des chalets', 'todo', 'medium', TIMESTAMP '2026-10-01 12:00:00', 11, TIMESTAMP '2025-11-20 09:00:00', TIMESTAMP '2025-12-01 09:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO task_assignees (task_id, user_id)
SELECT id, assigned_to FROM tasks WHERE id BETWEEN 1001 AND 1011
ON CONFLICT DO NOTHING;

-- Rows created by a writing state (duplicate) take ids after the seeded ones.
SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT max(id) FROM users), 100));
SELECT setval(pg_get_serial_sequence('projects', 'id'), GREATEST((SELECT max(id) FROM projects), 1000));
SELECT setval(pg_get_serial_sequence('tasks', 'id'), GREATEST((SELECT max(id) FROM tasks), 10000));

COMMIT;
