from flask import Flask, request, render_template
import sqlite3

app = Flask(__name__)

db_name = "database.db"
sql_file = "database.sql"

def get_db():
    conn = sqlite3.connect(db_name)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/newsletter", methods=["GET", "POST"])
def subscribe():
    if request.method == "POST":
        try:
            name = request.form.get("name")
            email = request.form.get("email")
            categories = request.form.getlist("categories")
            conn = get_db()
            with conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO Users(user_name, user_email) VALUES (?, ?);", (name, email))
                for cat in categories:
                    cursor.execute("SELECT category_id FROM Categories WHERE category = ?;", (cat,))
                    result = cursor.fetchone()
                    if result:
                        category_id = result[0]
                        cursor.execute(
                            "INSERT INTO UserCategories (user_email, category_id) VALUES (?, ?);",
                            (email, category_id)
                        )
            return render_template("newsletter.html")
        except Exception as e:
            return render_template("error.html", error=str(e))
    return render_template("newsletter.html")

@app.route("/ai-tools-directory")
def directory():
    tools = [
        {"tool_name": "ChatGPT", "category": "NLP", "date_added": "2023-07-01", "link": "https://chat.openai.com/"},
        {"tool_name": "Midjourney", "category": "Image Generation", "date_added": "2023-09-15", "link": "https://midjourney.com/"},
        {"tool_name": "Codeium", "category": "Coding", "date_added": "2024-03-11", "link": "https://codeium.com/"},
    ]
    return render_template("ai-tools-directory.html", tools=tools)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
