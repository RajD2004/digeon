CREATE TABLE users(
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL

);

CREATE TABLE market(
    product_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    product_name TEXT NOT NULL,
    product_price REAL,
    api_link TEXT NOT NULL,
    fields TEXT
);
