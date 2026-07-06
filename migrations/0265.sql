-- Geschäfte-Hierarchie (Kette → Filiale), analog zur Lagerort-Hierarchie (0262):
-- parent_shopping_location_id + Namens-Eindeutigkeit pro Ebene + rekursive Views
-- für Baum/Pfad und Ketten-Rollups.

-- 1) Table-Rebuild (Grocy-Idiom wie in 0049/0262): SQLite kann das
--    spaltengebundene UNIQUE(name) nicht per ALTER entfernen. legacy_alter_table
--    verhindert, dass das RENAME abhängige Views (z.B. die products_view-Kette,
--    die shopping_locations per JOIN nutzt) umzuschreiben versucht, während
--    shopping_locations kurz nicht existiert.
PRAGMA legacy_alter_table = ON;

ALTER TABLE shopping_locations RENAME TO shopping_locations_old;

CREATE TABLE shopping_locations (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	name TEXT NOT NULL,
	description TEXT,
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
	active TINYINT NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
	parent_shopping_location_id INTEGER
);

INSERT INTO shopping_locations
	(id, name, description, row_created_timestamp, active, parent_shopping_location_id)
SELECT
	id, name, description, row_created_timestamp, active, NULL
FROM shopping_locations_old;

DROP TABLE shopping_locations_old;

-- 2) Eindeutiger Name pro Ebene. SQLite behandelt NULL in UNIQUE als
--    verschieden, daher Ausdrucks-Index mit Sentinel -1 (ids sind >= 1),
--    damit auch doppelte Namen auf oberster Ebene verhindert werden.
CREATE UNIQUE INDEX uk_shopping_locations_parent_name
	ON shopping_locations (IFNULL(parent_shopping_location_id, -1), name);

-- 3) Aufgelöster Baum: Pfad, Ebene, Wurzel (für Tree-Anzeige/Sortierung).
CREATE VIEW shopping_locations_resolved
AS
WITH RECURSIVE tree(id, name, parent_shopping_location_id, root_id, level, path) AS (
	SELECT id, name, parent_shopping_location_id, id, 0, name
	FROM shopping_locations
	WHERE parent_shopping_location_id IS NULL

	UNION ALL

	SELECT sl.id, sl.name, sl.parent_shopping_location_id,
		t.root_id, t.level + 1, t.path || ' › ' || sl.name
	FROM shopping_locations sl
	JOIN tree t
		ON sl.parent_shopping_location_id = t.id
	WHERE t.level < 50
)
SELECT id, name, parent_shopping_location_id, root_id, level, path
FROM tree;

-- 4) Vorfahr -> Nachfahre (inkl. sich selbst) als Baustein für Ketten-Rollups
--    und die Wurzel-Normalisierung des Alias-Lernens (product_receipt_aliases).
CREATE VIEW shopping_locations_descendants
AS
WITH RECURSIVE dt(ancestor_id, location_id, level) AS (
	SELECT id, id, 0
	FROM shopping_locations

	UNION ALL

	SELECT dt.ancestor_id, sl.id, dt.level + 1
	FROM shopping_locations sl
	JOIN dt
		ON sl.parent_shopping_location_id = dt.location_id
	WHERE dt.level < 50
)
SELECT ancestor_id, location_id
FROM dt;
