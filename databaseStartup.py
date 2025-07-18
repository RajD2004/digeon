import pandas as pd
import sqlite3
from pathlib import Path
import re

db_file = "database.db"      # Your SQLite file
excel_folder = "excel"       # Folder with your Excel files

conn = sqlite3.connect(db_file)
cur = conn.cursor()

# ---- Create tables if they don't exist ----
cur.execute("""
CREATE TABLE IF NOT EXISTS Users(
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    user_email TEXT NOT NULL UNIQUE
);""")
cur.execute("""
CREATE TABLE IF NOT EXISTS Categories(
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL UNIQUE
);""")
cur.execute("""
CREATE TABLE IF NOT EXISTS UserCategories(
    Pkey INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    category_id INTEGER,
    FOREIGN KEY (user_email) REFERENCES Users(user_email),
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
);""")
cur.execute("""
CREATE TABLE IF NOT EXISTS Tools(
    tool_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT NOT NULL UNIQUE,
    category_id INTEGER,
    date_added DATETIME,
    link TEXT,
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
);""")
conn.commit()

# ---- Helper: Clean category names from filenames ----
def clean_category_name(stem):
    cleaned = re.sub(r'(?i)^ai agents? (for|in) ', '', stem)
    return cleaned.strip()

# ---- Helper: Create/find category ----
def get_or_create_category(cat_name):
    cur.execute("SELECT category_id FROM Categories WHERE category = ?", (cat_name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO Categories (category) VALUES (?)", (cat_name,))
    conn.commit()
    return cur.lastrowid

# ---- Helper: Insert a tool ----
def insert_tool(tool_name, category_id, link):
    cur.execute("""
        INSERT OR IGNORE INTO Tools (tool_name, category_id, date_added, link)
        VALUES (?, ?, date('now'), ?)
    """, (tool_name, category_id, link))

# ---- Main: Import all Excel files ----
for excel_file in Path(excel_folder).glob("*.xlsx"):
    category_name = clean_category_name(excel_file.stem)
    category_id = get_or_create_category(category_name)
    print(f"Processing '{excel_file.name}' as category '{category_name}' (id={category_id})")
    # Only skip the first row (junk), treat the next as header!
    df = pd.read_excel(excel_file, skiprows=1, header=0)
    print("  Columns found:", df.columns.tolist())
    for _, row in df.iterrows():
        tool_name = str(row.get("Name", "")).strip()
        link = str(row.get("Website / Source", "")).strip()
        if not tool_name:
            print("    [Skipping row: blank tool name]")
            continue
        print(f"    Importing: '{tool_name}' (category_id: {category_id}) (link: {link})")
        insert_tool(tool_name, category_id, link)
    conn.commit()

print("All done!")
