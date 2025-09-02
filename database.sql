DROP TABLE IF EXISTS Ratings;
DROP TABLE IF EXISTS NewsletterDeliveries;
DROP TABLE IF EXISTS NewsletterPostCategories;
DROP TABLE IF EXISTS UserCategories;
DROP TABLE IF EXISTS Tools;
DROP TABLE IF EXISTS NewsletterPosts;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Blogs;
DROP TABLE IF EXISTS BlogLikes;
DROP TABLE IF EXISTS BlogComments;


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

CREATE TABLE IF NOT EXISTS Ratings (
    rating_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_email  VARCHAR(255) NOT NULL,
    tool_id     INT NOT NULL,
    value       TINYINT NOT NULL,           
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ratings_user_email FOREIGN KEY (user_email) REFERENCES Users(user_email),
    CONSTRAINT fk_ratings_tool_id    FOREIGN KEY (tool_id)    REFERENCES Tools(tool_id),
    CONSTRAINT uq_ratings_user_tool  UNIQUE (user_email, tool_id),
    CONSTRAINT ck_ratings_value      CHECK (value BETWEEN 1 AND 5)
);

CREATE TABLE Blogs (
    blog_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image LONGBLOB,               
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter authoring + sending
CREATE TABLE IF NOT EXISTS NewsletterPosts (
  post_id     INT AUTO_INCREMENT PRIMARY KEY,
  subject     VARCHAR(200) NOT NULL,
  body        MEDIUMTEXT   NOT NULL,  -- may include token {{name}}
  status      ENUM('draft','published') NOT NULL DEFAULT 'draft',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS NewsletterPostCategories (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  post_id  INT NOT NULL,
  category VARCHAR(255) NOT NULL,
  FOREIGN KEY (post_id)  REFERENCES NewsletterPosts(post_id),
  FOREIGN KEY (category) REFERENCES Categories(category)
);

CREATE TABLE IF NOT EXISTS NewsletterDeliveries (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  post_id    INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  sent_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  success    TINYINT(1) NOT NULL DEFAULT 1,
  error_text TEXT NULL,
  FOREIGN KEY (post_id)    REFERENCES NewsletterPosts(post_id),
  FOREIGN KEY (user_email) REFERENCES Users(user_email)
);

CREATE TABLE IF NOT EXISTS BlogLikes (
  blog_id    INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blog_id, user_email),
  CONSTRAINT fk_bloglikes_blog
    FOREIGN KEY (blog_id) REFERENCES Blogs(blog_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS BlogComments (
  comment_id INT AUTO_INCREMENT PRIMARY KEY,
  blog_id    INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_name  VARCHAR(255) NULL,
  body       TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_blogcomments_blog
    FOREIGN KEY (blog_id) REFERENCES Blogs(blog_id) ON DELETE CASCADE
);
