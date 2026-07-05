CREATE TABLE product_receipt_aliases
(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	product_id INTEGER NOT NULL,
	shopping_location_id INTEGER,
	alias TEXT NOT NULL,
	times_confirmed INTEGER NOT NULL DEFAULT 1,
	last_used_timestamp DATETIME,
	row_created_timestamp DATETIME DEFAULT (datetime('now'))
);
