from pathlib import Path
import pandas as pd
import mysql.connector  # <-- change from sqlite3 to mysql.connector
import re

# Database and folder paths
excel_folder = "excel"

# Connect to MySQL database
conn = mysql.connector.connect(
    host="127.0.0.1",          # or your MySQL server address
    user="root",          # use your MySQL username
    password="Row90bit_20041803-2022-2026",   # use your MySQL password
    database="main_db"         # use the schema you created
)
cur = conn.cursor()

# Drop and recreate the Tools table with 'description' column
cur.execute("DROP TABLE IF EXISTS Tools")
cur.execute("""
    CREATE TABLE Tools (
        tool_id INT AUTO_INCREMENT PRIMARY KEY,
        tool_name VARCHAR(255) NOT NULL UNIQUE,
        category_id INT,
        date_added DATETIME,
        link TEXT,
        description TEXT,
        FOREIGN KEY (category_id) REFERENCES Categories(category_id)
    );
""")
conn.commit()

# Create Categories table if not exists
cur.execute("""
    CREATE TABLE IF NOT EXISTS Categories(
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(255) NOT NULL UNIQUE
    );
""")
conn.commit()

# ---- Helper: Clean category names from filenames ----
def clean_category_name(stem):
    cleaned = re.sub(r'(?i)^ai agents? (for|in) ', '', stem)
    return cleaned.strip()

# ---- Helper: Create/find category ----
def get_or_create_category(cat_name):
    cur.execute("SELECT category_id FROM Categories WHERE category = %s", (cat_name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO Categories (category) VALUES (%s)", (cat_name,))
    conn.commit()
    return cur.lastrowid

# ---- Helper: Insert a tool ----
def insert_tool(tool_name, category_id, link, description):
    cur.execute("""
        INSERT IGNORE INTO Tools (tool_name, category_id, date_added, link, description)
        VALUES (%s, %s, NOW(), %s, %s)
    """, (tool_name, category_id, link, description))

# ---- Main: Import all Excel files ----
for excel_file in Path(excel_folder).glob("*.xlsx"):
    category_name = clean_category_name(excel_file.stem)
    category_id = get_or_create_category(category_name)
    print(f"Processing '{excel_file.name}' as category '{category_name}' (id={category_id})")
    df = pd.read_excel(excel_file, skiprows=1, header=0)
    print("  Columns found:", df.columns.tolist())
    for _, row in df.iterrows():
        tool_name = str(row.get("Name", "")).strip()
        link = str(
            row.get("Website / Source") or
            row.get("Website/Source") or
            row.get("Link") or
            row.get("Website") or
            row.get("Source") or
            ""
        ).strip()
        description = str(row.get("Use Case", "")).strip()
        if not tool_name:
            print("    [Skipping row: blank tool name]")
            continue
        print(f"    Importing: '{tool_name}' (category_id: {category_id}) (link: {link})")
        insert_tool(tool_name, category_id, link, description)
    conn.commit()

conn.close()
print("All done!")
