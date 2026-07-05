-- Location-Hierarchie (Variante A): parent_location_id + Namens-Eindeutigkeit
-- pro Ebene + rekursive Views für Baum/Pfad und Bestands-Rollups.

-- 1) Table-Rebuild (Grocy-Idiom wie in 0049): SQLite kann das spaltengebundene
--    UNIQUE(name) nicht per ALTER entfernen. legacy_alter_table verhindert, dass
--    das RENAME abhängige Views (z.B. stock_current_locations) umzuschreiben
--    versucht, während locations kurz nicht existiert.
PRAGMA legacy_alter_table = ON;

ALTER TABLE locations RENAME TO locations_old;

CREATE TABLE locations (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	name TEXT NOT NULL,
	description TEXT,
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
	is_freezer TINYINT NOT NULL DEFAULT 0,
	active TINYINT NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
	parent_location_id INTEGER
);

INSERT INTO locations
	(id, name, description, row_created_timestamp, is_freezer, active, parent_location_id)
SELECT
	id, name, description, row_created_timestamp, is_freezer, active, NULL
FROM locations_old;

DROP TABLE locations_old;

-- 2) Eindeutiger Name pro Ebene. SQLite behandelt NULL in UNIQUE als
--    verschieden, daher Ausdrucks-Index mit Sentinel -1 (ids sind >= 1),
--    damit auch doppelte Namen auf oberster Ebene verhindert werden.
CREATE UNIQUE INDEX uk_locations_parent_name
	ON locations (IFNULL(parent_location_id, -1), name);

-- 3) Aufgelöster Baum: Pfad, Ebene, Wurzel (für Tree-Anzeige/Sortierung).
CREATE VIEW locations_resolved
AS
WITH RECURSIVE tree(id, name, parent_location_id, root_id, level, path) AS (
	SELECT id, name, parent_location_id, id, 0, name
	FROM locations
	WHERE parent_location_id IS NULL

	UNION ALL

	SELECT l.id, l.name, l.parent_location_id,
		t.root_id, t.level + 1, t.path || ' › ' || l.name
	FROM locations l
	JOIN tree t
		ON l.parent_location_id = t.id
	WHERE t.level < 50
)
SELECT id, name, parent_location_id, root_id, level, path
FROM tree;

-- 4) Vorfahr -> Nachfahre (inkl. sich selbst) als Baustein für Bestands-Rollups.
CREATE VIEW locations_descendants
AS
WITH RECURSIVE dt(ancestor_id, location_id, level) AS (
	SELECT id, id, 0
	FROM locations

	UNION ALL

	SELECT dt.ancestor_id, l.id, dt.level + 1
	FROM locations l
	JOIN dt
		ON l.parent_location_id = dt.location_id
	WHERE dt.level < 50
)
SELECT ancestor_id, location_id
FROM dt;
