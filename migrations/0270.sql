-- Country of origin and quality/grade as optional per-purchase (stock entry) attributes
-- See https://github.com/grocy/grocy (feature: track where a bought product comes from
-- and its grade, e.g. organic, without creating a separate product per variant)

CREATE TABLE countries (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	name TEXT NOT NULL UNIQUE,
	iso_code TEXT,
	description TEXT,
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE qualities (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	name TEXT NOT NULL UNIQUE,
	description TEXT,
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime'))
);

ALTER TABLE stock
ADD origin_country_id INTEGER;

ALTER TABLE stock
ADD quality_id INTEGER;

ALTER TABLE stock_log
ADD origin_country_id INTEGER;

ALTER TABLE stock_log
ADD quality_id INTEGER;

-- The helper view which decides which stock entries can be compacted (merged) must
-- treat entries with a different country of origin or quality as distinct, otherwise
-- two purchases that only differ in origin/quality would be silently merged.
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
GROUP BY s.product_id, s.best_before_date, s.purchased_date, s.price, s.open, s.opened_date, s.location_id, s.shopping_location_id, IFNULL(s.note, ''), IFNULL(s.origin_country_id, -1), IFNULL(s.quality_id, -1)
HAVING COUNT(*) > 1;
