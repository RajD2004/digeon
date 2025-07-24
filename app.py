from flask import Flask, request, render_template, jsonify
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
    conn = get_db()
    categories = conn.execute("SELECT category FROM Categories ORDER BY category").fetchall()
    categories = [row[0] for row in categories]
    conn.close()

    if request.method == "POST":
        # ... your subscription logic here ...
        return render_template("newsletter.html", categories=categories)
    return render_template("newsletter.html", categories=categories)


@app.route("/ai-tools-directory")
def directory():
    conn = get_db()
    q = """
      SELECT t.tool_name, t.date_added, t.link, c.category
      FROM Tools t
      JOIN Categories c ON t.category_id = c.category_id
      ORDER BY c.category, t.tool_name
    """
    tools = conn.execute(q).fetchall()
    conn.close()
    return render_template("ai-tools-directory.html", tools=tools)


@app.route("/api/categories")
def api_categories():
    conn = get_db()
    rows = conn.execute("SELECT category_id, category FROM Categories ORDER BY category").fetchall()
    return jsonify([{"id": r[0], "name": r[1]} for r in rows])

@app.route("/api/tools")
def api_tools():
    category_id = request.args.get("category_id", type=int)
    q = """
      SELECT t.tool_name, t.date_added, t.link
      FROM Tools t
      WHERE t.category_id = ?
      ORDER BY t.tool_name
    """
    rows = get_db().execute(q, (category_id,)).fetchall()
    return jsonify([{"tool_name": r[0], "date_added": r[1], "link": r[2]} for r in rows])


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
