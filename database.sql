DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS UserCategories;
DROP TABLE IF EXISTS Tools;

CREATE TABLE IF NOT EXISTS Users(
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    user_email TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Categories(
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS UserCategories(
    Pkey INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    category TEXT,
    FOREIGN KEY (user_email) REFERENCES Users(user_email),
    FOREIGN KEY (category) REFERENCES Categories(category)
);

CREATE TABLE Tools(
    tool_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL UNIQUE,
    category_id INTEGER,
    date_added DATETIME,
    link TEXT,
    description TEXT,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
);
