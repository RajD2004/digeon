
CREATE TABLE Users(
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    user_email TEXT NOT NULL UNIQUE
);


CREATE TABLE Categories(
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL UNIQUE
);

CREATE TABLE UserCategories(
    Pkey INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES (Users.user_id),
    FOREIGN KEY (category_id) REFERENCES (Categories.category_id)
);

CREATE TABLE Tools(
    tool_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL UNIQUE,
    category_id INTEGER,
    date_added DATETIME,
    FOREIGN KEY (category_id) REFERENCES (Categories.category_id)
);