CREATE TABLE receipts
(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	shopping_location_id INTEGER,
	date DATE,
	status TEXT NOT NULL DEFAULT 'paid',
	description TEXT,
	row_created_timestamp DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE receipt_files
(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	receipt_id INTEGER NOT NULL,
	file_name TEXT NOT NULL,
	row_created_timestamp DATETIME DEFAULT (datetime('now'))
);
