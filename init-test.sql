-- Seed minimal pour les tests isolés (performance / sécurité) du front Projects.
-- L'utilisateur 2 est celui référencé par les JWT de test (claim sub = "2") :
--   * load-test.js le signe dynamiquement et l'envoie en cookie accessToken,
--   * docker-compose-security.yml injecte un cookie statique via le replacer ZAP.
INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES (2, 'Perf', 'Tester', 'perf-tester@mairie360.fr', '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active')
ON CONFLICT (id) DO NOTHING;
-- Core API >= 1.1.1 exige au moins un rôle sur l'utilisateur pour GET /user/me
-- (sinon 502 côté BFF User, que BFF_Project appelle, donc sur /projects-page et sur le shell du front).
-- The "User" role alone cannot create projects: BFF Project answers 403 ("The Responsable, Maire
-- or Admin role is required"). Since MAIR-516 the test user also carries the "Admin" role, so the
-- k6 write scenario (project creation and deletion) and the scan reach those routes.
INSERT INTO user_roles (user_id, role_id)
SELECT 2, r.id FROM roles r WHERE lower(r.name) IN ('user', 'admin')
ON CONFLICT DO NOTHING;
-- A user holds a single role (user_roles is keyed by user_id): the insert above keeps whichever
-- row comes first. Make it "Admin" explicitly, the role the journeys and the k6 writes need
-- (Project API checks it in the database), MAIR-603.
UPDATE user_roles SET role_id = (SELECT id FROM roles WHERE name = 'Admin') WHERE user_id = 2;
-- End-to-end journeys (MAIR-603): user 3 only carries the "User" role, so BFF Project refuses its
-- project writes (403) and the page hides "Nouveau projet" for it. Same template password hash.
INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES (3, 'Membre', 'Lecteur', 'membre-lecteur@mairie360.fr', '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 3, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;
-- The users above carry explicit ids: move the id sequence past them, or the first account a
-- journey creates (Administrator) collides with user 2 (MAIR-603).
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
