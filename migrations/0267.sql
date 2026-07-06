-- Fix/Härtung analog 0264: Geschäfte mit ungültigem parent_shopping_location_id
-- (leerer String '' – etwa durch veraltet gecachtes Formular-JS – oder ein
-- verwaister Verweis auf ein nicht existierendes Geschäft) tauchen nicht als
-- Wurzel im Baum auf und lassen sich daher nicht als Kette wählen. Auf NULL
-- normalisieren.
UPDATE shopping_locations
SET parent_shopping_location_id = NULL
WHERE parent_shopping_location_id IS NOT NULL
	AND parent_shopping_location_id NOT IN (SELECT id FROM shopping_locations);

-- shopping_locations_resolved härten: '' wie NULL als Wurzel behandeln
-- (Defense-in-Depth, falls über die API doch ein Leerstring gesetzt wird).
DROP VIEW shopping_locations_resolved;
CREATE VIEW shopping_locations_resolved
AS
WITH RECURSIVE tree(id, name, parent_shopping_location_id, root_id, level, path) AS (
	SELECT id, name, parent_shopping_location_id, id, 0, name
	FROM shopping_locations
	WHERE parent_shopping_location_id IS NULL OR parent_shopping_location_id = ''

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
