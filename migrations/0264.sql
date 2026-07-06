-- Fix: Standorte mit ungültigem parent_location_id (leerer String '' – durch ein
-- veraltet gecachtes Formular-JS entstanden – oder ein verwaister Verweis auf
-- einen nicht existierenden Ort) tauchen nicht als Wurzel im Baum auf und lassen
-- sich daher nicht als Elternteil wählen. Auf NULL normalisieren.
UPDATE locations
SET parent_location_id = NULL
WHERE parent_location_id IS NOT NULL
	AND parent_location_id NOT IN (SELECT id FROM locations);

-- locations_resolved härten: '' wie NULL als Wurzel behandeln (Defense-in-Depth,
-- falls über die API doch ein Leerstring gesetzt wird).
DROP VIEW locations_resolved;
CREATE VIEW locations_resolved
AS
WITH RECURSIVE tree(id, name, parent_location_id, root_id, level, path) AS (
	SELECT id, name, parent_location_id, id, 0, name
	FROM locations
	WHERE parent_location_id IS NULL OR parent_location_id = ''

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
