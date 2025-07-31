from flask import Flask, request, render_template, jsonify
import sqlite3
import hashlib
import os
import base64

app = Flask(__name__)

db_name = "database.db"
sql_file = "database.sql"

mkt_sql = "Marketplace.sql"
mkt_db = "Marketplace.db"

def get_db():
    conn = sqlite3.connect(db_name)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def get_mkt_db():
    conn = sqlite3.connect(mkt_db)
    conn.executescript(mkt_sql)
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

def generate_salt(length=16):
    """
    Generates a secure random salt.
    :param length: Length in bytes (default 16, for 128 bits)
    :return: Base64-encoded string salt
    """
    salt = os.urandom(length)
    return base64.b64encode(salt).decode('utf-8')


def validate_password(password : str) -> bool:

    #check if atleast 8 characters
    if len(password) < 8:
        return False
    
    #check if there is number, capital letter, smaller letter
    isNum = False
    isCap = False
    isSmall = False

    for ch in password:
        if ch.isupper():
            isCap = True
        
        if ch.islower():
            isSmall = True
        
        if ch.isnumeric():
            isNum = True
    
    if not (isNum and isSmall and isCap):
        return False

    return True



@app.route("/api/register", methods = ['POST'])
def marketplace_create():
    try:
        conn = get_mkt_db()
        with conn:
            cursor = conn.cursor()
            name, email, password = request.form.get('name'), request.form.get("email"), request.form.get("password")

            if not validate_password(password):
                return jsonify({"status" : 2, "Except" : "Password does not meet requirements!!"})
            
            cursor.execute("SELECT * FROM users WHERE name = ? AND email = ?;", (name, email))
            user_auth = cursor.fetchone()

            if user_auth:
                return jsonify({"status" : 2, "Except" : "User already in database"})
            
            salt = generate_salt()
            pass_hash = hashlib.sha256((password + salt).encode()).hexdigest()

            cursor.execute("INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?);", (name, email, pass_hash, salt))

            return jsonify({"status" : 1})

    except Exception as E:
        return jsonify({"Except" : str(E)})


@app.route("/api/login")
def marketplace_auth():
    pass



@app.route("/marketplace")
def marketplace():
    return render_template("marketplace.html")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
