-- Equipmentgruppen als eigenständige Entität (unabhängig von product_groups).
-- Equipment sind keine Produkte; Gruppen überschneiden sich nur gelegentlich.

-- 1) Neue Entität equipment_groups (analog product_groups inkl. active-Spalte).
CREATE TABLE equipment_groups (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	name TEXT NOT NULL UNIQUE,
	description TEXT,
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
	active TINYINT NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);

-- 2) equipment: das fachlich falsche product_group_id durch equipment_group_id
--    ersetzen. Table-Rebuild (Grocy-Idiom wie in 0262), da nicht jede
--    ausgelieferte SQLite-Version DROP COLUMN unterstützt. Auf equipment
--    liegen keine abhängigen Views/Trigger, der Rebuild ist daher unkritisch.
PRAGMA legacy_alter_table = ON;

ALTER TABLE equipment RENAME TO equipment_old;

CREATE TABLE equipment (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	name TEXT NOT NULL UNIQUE,
	description TEXT,
	instruction_manual_file_name TEXT,
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
	receipt_id INTEGER,
	location_id INTEGER,
	equipment_group_id INTEGER
);

INSERT INTO equipment
	(id, name, description, instruction_manual_file_name, row_created_timestamp, receipt_id, location_id)
SELECT
	id, name, description, instruction_manual_file_name, row_created_timestamp, receipt_id, location_id
FROM equipment_old;

DROP TABLE equipment_old;

PRAGMA legacy_alter_table = OFF;
