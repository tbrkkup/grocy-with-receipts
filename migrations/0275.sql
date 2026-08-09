-- The receipt alias dictionary learns more than "which product": the same
-- receipt text usually also means the same origin and the same qualities.
-- "TOMATEN BIO ES" is not just Roma tomatoes, it is Roma tomatoes from Spain in
-- organic quality - so the bulk purchase can prefill all three from one hit.
--
-- Both are suggestions, not constraints: they only prefill the review table and
-- can be changed there before importing.

ALTER TABLE product_receipt_aliases
ADD origin_country_id INTEGER;

-- Qualities are multi valued since 0274, so they need their own link table here
-- as well instead of a single column.
CREATE TABLE product_receipt_alias_qualities (
	id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	alias_id INTEGER NOT NULL,
	quality_id INTEGER NOT NULL,
	row_created_timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
	UNIQUE(alias_id, quality_id)
);

CREATE INDEX product_receipt_alias_qualities_alias_id ON product_receipt_alias_qualities(alias_id);
