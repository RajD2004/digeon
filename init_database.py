from pathlib import Path
import pandas as pd
import mysql.connector
import re
import os

# --- Config ---
excel_folder = "excel"

conn = mysql.connector.connect(
    host=os.getenv("DB_HOST", "mysql"),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", "Row90bit_20041803-2022-2026"),
    database=os.getenv("DB_NAME", "main_db"),
)

cur = conn.cursor()

# ---------- DDL: tables ----------
# Disable FK checks for safe drops when running idempotently
cur.execute("SET FOREIGN_KEY_CHECKS=0")

# Drop child table before parent to avoid FK errors (if present)
cur.execute("DROP TABLE IF EXISTS Ratings")
cur.execute("DROP TABLE IF EXISTS Tools")
# Categories can remain; we just ensure it exists below

cur.execute("SET FOREIGN_KEY_CHECKS=1")
conn.commit()

# Categories
cur.execute(
    """
    CREATE TABLE IF NOT EXISTS Categories(
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(255) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""
)
conn.commit()

# Tools (referencing Categories)
cur.execute(
    """
    CREATE TABLE IF NOT EXISTS Tools(
        tool_id INT AUTO_INCREMENT PRIMARY KEY,
        tool_name VARCHAR(255) NOT NULL UNIQUE,
        category_id INT,
        date_added DATETIME,
        link TEXT,
        description TEXT,
        CONSTRAINT fk_tools_category
            FOREIGN KEY (category_id) REFERENCES Categories(category_id)
            ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""
)
conn.commit()

# Ratings (referencing Users + Tools)
# NOTE: assumes you already have Users(user_email) from your app.
cur.execute(
    """
    CREATE TABLE IF NOT EXISTS Ratings (
        rating_id  INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        tool_id    INT NOT NULL,
        value      TINYINT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_ratings_user_email
            FOREIGN KEY (user_email) REFERENCES Users(user_email)
            ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_ratings_tool_id
            FOREIGN KEY (tool_id) REFERENCES Tools(tool_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT uq_ratings_user_tool UNIQUE (user_email, tool_id),
        CONSTRAINT ck_ratings_value CHECK (value BETWEEN 1 AND 5)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""
)
conn.commit()

# ---------- Helpers ----------
def clean_category_name(stem: str) -> str:
    cleaned = re.sub(r"(?i)^ai agents? (for|in) ", "", stem)
    return cleaned.strip()

def get_or_create_category(cat_name: str) -> int:
    cur.execute("SELECT category_id FROM Categories WHERE category = %s", (cat_name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO Categories (category) VALUES (%s)", (cat_name,))
    conn.commit()
    return cur.lastrowid

def insert_tool(tool_name: str, category_id: int, link: str, description: str) -> None:
    cur.execute(
        """
        INSERT IGNORE INTO Tools (tool_name, category_id, date_added, link, description)
        VALUES (%s, %s, NOW(), %s, %s)
        """,
        (tool_name, category_id, link, description),
    )

# ---------- Import all Excel files ----------
for excel_file in Path(excel_folder).glob("*.xlsx"):
    category_name = clean_category_name(excel_file.stem)
    category_id = get_or_create_category(category_name)
    print(f"Processing '{excel_file.name}' as category '{category_name}' (id={category_id})")

    # Your sheets have a header row at row 2; adjust if needed
    df = pd.read_excel(excel_file, skiprows=1, header=0)
    print("  Columns found:", df.columns.tolist())

    for _, row in df.iterrows():
        tool_name = str(row.get("Name", "")).strip()
        link = str(
            row.get("Website / Source")
            or row.get("Website/Source")
            or row.get("Link")
            or row.get("Website")
            or row.get("Source")
            or ""
        ).strip()
        description = str(row.get("Use Case", "")).strip()

        if not tool_name:
            print("    [Skipping row: blank tool name]")
            continue

        print(f"    Importing: '{tool_name}' (category_id: {category_id}) (link: {link})")
        insert_tool(tool_name, category_id, link, description)

    conn.commit()

cur.close()
conn.close()
print("All done!")
