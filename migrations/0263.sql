-- Löschschutz: Ein Lagerort mit Unterorten darf nicht gelöscht werden
-- (deckt Einzel-/Bulk-/API-Löschung ab; die Web-UI zeigt zusätzlich vorab
-- einen Hinweis). Kinder müssen erst verschoben/gelöscht werden.
CREATE TRIGGER location_prevent_delete_with_children
BEFORE DELETE ON locations
FOR EACH ROW
WHEN (SELECT COUNT(*) FROM locations WHERE parent_location_id = OLD.id) > 0
BEGIN
	SELECT RAISE(ABORT, 'Cannot delete a location that has sub-locations');
END;
