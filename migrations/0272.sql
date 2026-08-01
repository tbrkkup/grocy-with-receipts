-- Master data pages for countries/qualities: both need an "active" flag like
-- all other master data entities, so that unneeded entries (e.g. most of the
-- ~200 seeded countries) can be hidden from the purchase form without deleting
-- them (deleting is not possible anymore once an entry is referenced by stock).

ALTER TABLE countries
ADD active TINYINT NOT NULL DEFAULT 1 CHECK(active IN (0, 1));

ALTER TABLE qualities
ADD active TINYINT NOT NULL DEFAULT 1 CHECK(active IN (0, 1));

-- The stock journal helper view selects its columns explicitly, so the new
-- origin country / quality of a booking have to be added here to be displayable
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
	c.name AS origin_country_name,
	sl.quality_id,
	q.name AS quality_name
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
	ON sl.origin_country_id = c.id
LEFT JOIN qualities q
	ON sl.quality_id = q.id;
