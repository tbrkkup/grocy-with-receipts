-- Qualities become hierarchical and assignable in bulk:
--   * a stock entry can carry several qualities ("Bio" AND "Rohkost")
--   * a quality can have a parent ("Demeter" below "Bio"), and assigning a child
--     implies its ancestors
--
-- Only what the user actually picked is stored; the ancestors are derived on
-- read, so renaming and re-parenting a quality stays consistent with every
-- booking ever made.

ALTER TABLE qualities
ADD parent_quality_id INTEGER;

-- Resolved hierarchy (same shape and cycle guard as locations_resolved):
-- root_id is the top level ancestor, used to roll purchases up in the price
-- history, path is the indented display name.
CREATE VIEW qualities_resolved
AS
WITH RECURSIVE tree(id, name, parent_quality_id, root_id, level, path) AS (
	SELECT id, name, parent_quality_id, id, 0, name
	FROM qualities
	WHERE parent_quality_id IS NULL OR parent_quality_id = ''

	UNION ALL

	SELECT q.id, q.name, q.parent_quality_id,
		t.root_id, t.level + 1, t.path || ' › ' || q.name
	FROM qualities q
	JOIN tree t
		ON q.parent_quality_id = t.id
	WHERE t.level < 50
)
SELECT id, name, parent_quality_id, root_id, level, path
FROM tree;

-- Assigned qualities per stock entry. Keyed on stock_id (not on stock.id) like
-- the userfield values are: rows sharing a stock_id always share their qualities.
CREATE TABLE stock_qualities (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	stock_id TEXT NOT NULL,
	quality_id INTEGER NOT NULL,
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
	UNIQUE(stock_id, quality_id)
);

CREATE INDEX stock_qualities_stock_id ON stock_qualities(stock_id);

-- Journal rows keep their own assignments: a booking records the state at that
-- point in time, which may differ from what the stock entry carries today.
CREATE TABLE stock_log_qualities (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	stock_log_id INTEGER NOT NULL,
	quality_id INTEGER NOT NULL,
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
	UNIQUE(stock_log_id, quality_id)
);

CREATE INDEX stock_log_qualities_stock_log_id ON stock_log_qualities(stock_log_id);

-- Denormalised signature of the RESOLVED quality set (sorted, comma separated
-- ids including the implied ancestors). stock_splits decides by GROUP BY which
-- entries may be compacted, and a set cannot be grouped on directly. Using the
-- resolved set means {Demeter} and {Bio, Demeter} count as equal - they mean
-- the same thing once ancestors are implied.
-- Maintained exclusively by StockService, never write it directly.
ALTER TABLE stock
ADD qualities_key TEXT;

-- Carry over the previous single assignment
INSERT INTO stock_qualities (stock_id, quality_id)
SELECT DISTINCT stock_id, quality_id
FROM stock
WHERE quality_id IS NOT NULL;

INSERT INTO stock_log_qualities (stock_log_id, quality_id)
SELECT id, quality_id
FROM stock_log
WHERE quality_id IS NOT NULL;

-- No hierarchy exists yet at this point, so the resolved set equals the plain one
UPDATE stock
SET qualities_key = (
	SELECT GROUP_CONCAT(quality_id)
	FROM (
		SELECT sq.quality_id
		FROM stock_qualities sq
		WHERE sq.stock_id = stock.stock_id
		ORDER BY sq.quality_id
	)
)
WHERE EXISTS(SELECT 1 FROM stock_qualities sq WHERE sq.stock_id = stock.stock_id);

-- Group by the signature instead of the single column
DROP VIEW stock_splits;
CREATE VIEW stock_splits
AS

/*
	Helper view which shows splitted stock rows which could be compacted

	Stock entries with a stock_id starting with "x"
	and those with userfields shouldn't be compacted
*/

SELECT
	s.product_id,
	SUM(s.amount) AS total_amount,
	MIN(s.stock_id) AS stock_id_to_keep,
	MAX(s.id) AS id_to_keep,
	GROUP_CONCAT(s.id) AS id_group,
	GROUP_CONCAT(s.stock_id) AS stock_id_group,
	s.id -- Dummy
FROM stock s
WHERE s.stock_id NOT LIKE 'x%'
	AND NOT EXISTS(
		SELECT 1 FROM userfield_values
		WHERE object_id = s.stock_id
			AND field_id IN (SELECT id FROM userfields WHERE entity = 'stock')
			AND IFNULL(value, '') != ''
		)
GROUP BY s.product_id, s.best_before_date, s.purchased_date, s.price, s.open, s.opened_date, s.location_id, s.shopping_location_id, IFNULL(s.note, ''), IFNULL(s.origin_country_id, -1), IFNULL(s.qualities_key, '')
HAVING COUNT(*) > 1;

-- The single quality_name is gone: a booking can now carry several qualities,
-- and their names are resolved when reading so that renames apply retroactively.
DROP VIEW uihelper_stock_journal;
CREATE VIEW uihelper_stock_journal
AS
SELECT
	sl.id,
	sl.row_created_timestamp,
	sl.correlation_id,
	sl.undone,
	sl.undone_timestamp,
	sl.transaction_type,
	sl.spoiled,
	sl.amount,
	sl.location_id,
	l.name AS location_name,
	p.name AS product_name,
	qu.name AS qu_name,
	qu.name_plural AS qu_name_plural,
	u.display_name AS user_display_name,
	p.id AS product_id,
	sl.note,
	sl.stock_id,
	sl.origin_country_id,
	c.name AS origin_country_name
FROM stock_log sl
LEFT JOIN users_dto u
	ON sl.user_id = u.id
JOIN products p
	ON sl.product_id = p.id
JOIN locations l
	ON sl.location_id = l.id
JOIN quantity_units qu
	ON p.qu_id_stock = qu.id
LEFT JOIN countries c
	ON sl.origin_country_id = c.id;

-- The price history needs the stock_log id to join the assigned qualities; the
-- existing "id" column is only a dummy carrying the product id for LessQL.
DROP VIEW products_price_history;
CREATE VIEW products_price_history
AS
SELECT
	sl.product_id AS id, -- Dummy, LessQL needs an id column
	sl.stock_log_id,
	sl.product_id,
	sl.price,
	IFNULL(sl.edited_origin_amount, sl.amount) AS amount,
	sl.purchased_date,
	sl.shopping_location_id,
	sl.origin_country_id,
	sl.transaction_type
FROM (
	SELECT sl.*, sl.id AS stock_log_id, CASE WHEN sl.transaction_type = 'stock-edit-new' THEN see.edited_origin_amount END AS edited_origin_amount
	FROM stock_log sl
	LEFT JOIN stock_edited_entries see
		ON sl.stock_id = see.stock_id
) sl
WHERE sl.undone = 0
	AND (
		(sl.transaction_type IN ('purchase', 'inventory-correction', 'self-production') AND sl.stock_id NOT IN (SELECT stock_id FROM stock_edited_entries)) -- Unedited origin entries
		OR (sl.transaction_type = 'stock-edit-new' AND sl.id IN (SELECT stock_log_id_of_newest_edited_entry FROM stock_edited_entries)) -- Edited origin entries => take the newest "stock-edit-new" one
	)
	AND IFNULL(sl.price, 0) > 0
	AND IFNULL(sl.amount, 0) > 0;
