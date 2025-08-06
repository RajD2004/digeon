DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS UserCategories;
DROP TABLE IF EXISTS Tools;

CREATE TABLE IF NOT EXISTS Users(
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    user_name TEXT,
    user_email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Categories(
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS UserCategories(
    Pkey INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255),
    category VARCHAR(255),
    FOREIGN KEY (user_email) REFERENCES Users(user_email),
    FOREIGN KEY (category) REFERENCES Categories(category)
);

CREATE TABLE Tools(
    tool_id INT AUTO_INCREMENT PRIMARY KEY,
    tool_name VARCHAR(255) NOT NULL UNIQUE,
    category_id INT,
    date_added DATETIME,
    link TEXT,
    description TEXT,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
);
