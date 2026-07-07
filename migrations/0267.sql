-- Löschschutz: Ein Geschäft (Kette) mit Filialen darf nicht gelöscht werden
-- (deckt Einzel-/Bulk-/API-Löschung ab; die Web-UI zeigt zusätzlich vorab einen
-- Hinweis). Filialen müssen erst verschoben/gelöscht werden. Analog zu 0263.
CREATE TRIGGER shopping_location_prevent_delete_with_children
BEFORE DELETE ON shopping_locations
FOR EACH ROW
WHEN (SELECT COUNT(*) FROM shopping_locations WHERE parent_shopping_location_id = OLD.id) > 0
BEGIN
	SELECT RAISE(ABORT, 'Cannot delete a store that has branches');
END;
