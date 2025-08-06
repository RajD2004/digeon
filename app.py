from flask import Flask, request, render_template, jsonify, session, redirect, url_for
import mysql.connector
import os
import base64
import json
import hashlib

app = Flask(__name__)
app.secret_key = "YOUR_SUPER_SECRET_KEY"



def get_db():
    return mysql.connector.connect(
        host="127.0.0.1",       # or your MySQL server address
        user="root",       # your MySQL username
        password="Row90bit_20041803-2022-2026",# your MySQL password
        database="main_db"      # the correct database name
    )

def get_mkt_db():
    return mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="Row90bit_20041803-2022-2026",
        database="marketplace_db"
    )



@app.route('/')
def home():
    return render_template('index.html')


@app.route("/newsletter", methods=["GET", "POST"])
def subscribe():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT category FROM Categories ORDER BY category")
    categories = [row[0] for row in cursor.fetchall()]
    cursor.close()
    conn.close()

    if request.method == "POST":
        # ... your subscription logic here ...
        return render_template("newsletter.html", categories=categories)
    return render_template("newsletter.html", categories=categories)

@app.route("/newsletter-form")
def newsletter_form():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT category FROM Categories ORDER BY category")
    rows = rows.fetchall()
    categories = [row[0] for row in rows]
    cursor.close()
    conn.close()
    return render_template("newsletter.html", categories=categories)

@app.route("/api/subscribe", methods=["POST"])
def api_subscribe():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    categories = data.get("categories", [])

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT IGNORE INTO Users (user_name, user_email) VALUES (%s, %s);", (name, email))
        conn.commit()
        for cat in categories:
            cursor.execute("INSERT IGNORE INTO UserCategories (user_email, category) VALUES (%s, %s);", (email, cat))
            conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": 1})
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"status": 2, "error": str(e)})
    finally:
        cursor.close()
        conn.close()


@app.route("/directory")
def directory():
    return render_template("directory.html")

@app.route("/api/categories")
def api_categories():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT category_id, category FROM Categories ORDER BY category")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([{"id": row[0], "name": row[1]} for row in rows])

@app.route("/api/tools")
def api_tools():
    category_id = request.args.get("category_id", type=int)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT tool_name, description, link FROM Tools WHERE category_id = %s ORDER BY tool_name",
        (category_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([
        {"name": row[0], "desc": row[1], "link": row[2]} for row in rows
    ])

@app.route("/api/tool-link")
def api_tool_link():
    name = request.args.get("name")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT link FROM Tools WHERE tool_name = %s", (name,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify({"link": row[0]} if row else {"link": None})


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
        cursor = conn.cursor()
        name, email, password = request.form.get('name'), request.form.get("email"), request.form.get("password")

        if not validate_password(password):
            return jsonify({"status" : 2, "Except" : "Password does not meet requirements!!"})
        
        cursor.execute("SELECT * FROM users WHERE name = %s AND email = %s;", (name, email))
        user_auth = cursor.fetchone()

        if user_auth:
            return jsonify({"status" : 2, "Except" : "User already in database"})
        
        salt = generate_salt()
        pass_hash = hashlib.sha256((password + salt).encode()).hexdigest()

        cursor.execute("INSERT INTO users (name, email, password_hash, salt) VALUES (%s, %s, %s, %s);", (name, email, pass_hash, salt))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status" : 1})

    except Exception as E:
        cursor.close()
        conn.close()
        return jsonify({"Except" : str(E)})


@app.route("/api/login", methods=["POST"])
def marketplace_auth():
    try:
        conn = get_mkt_db()
        cursor = conn.cursor()
        email = request.form.get("email")
        password = request.form.get("password")
        cursor.execute("SELECT password_hash, salt FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"status": 2, "Except": "Invalid credentials"})
        stored_hash, salt = user
        calc_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        if calc_hash == stored_hash:
            # Set session
            session["marketplace_user"] = email
            cursor.close()
            conn.close()
            return jsonify({"status": 1})
        else:
            cursor.close()
            conn.close()
            return jsonify({"status": 2, "Except": "Invalid credentials"})
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"status": 2, "Except": str(e)})


# Helper for password validation (already present)
# def validate_password(password: str) -> bool:

@app.route("/api/dev-register", methods=['POST'])
def dev_register():
    try:
        conn = get_mkt_db()
        cursor = conn.cursor()
        email = request.form.get("email")
        password = request.form.get("password")
        if not email or not password:
            conn.close()
            cursor.close()
            return jsonify({"status": 2, "Except": "Email and password required"})
        if not validate_password(password):
            conn.close()
            cursor.close()
            return jsonify({"status": 2, "Except": "Password does not meet requirements"})
        cursor.execute("SELECT * FROM developers WHERE email = %s", (email,))
        if cursor.fetchone():
            conn.close()
            cursor.close()
            return jsonify({"status": 2, "Except": "Developer already registered"})
        salt = generate_salt()
        pass_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        cursor.execute("INSERT INTO developers (email, password_hash, salt) VALUES (%s, %s, %s)", (email, pass_hash, salt))
        conn.commit()
        conn.close()
        cursor.close()
        return jsonify({"status": 1})
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"Except": str(e)})

@app.route("/api/dev-login", methods=["POST"])
def dev_login():
    try:
        conn = get_mkt_db()
        cursor = conn.cursor()
        email = request.form.get("email")
        password = request.form.get("password")
        cursor.execute("SELECT password_hash, salt FROM developers WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"status": 2, "Except": "Invalid credentials"})
        stored_hash, salt = user
        calc_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        if calc_hash == stored_hash:
            session["dev_user"] = email
            cursor.close()
            conn.close()
            return jsonify({"status": 1})
        else:
            cursor.close()
            conn.close()
            return jsonify({"status": 2, "Except": "Invalid credentials"})
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"status": 2, "Except": str(e)})

@app.route("/api/agent-register", methods=["POST"])
def agent_register():
    if "dev_user" not in session:
        return jsonify({"status": 2, "Except": "Not logged in as developer"})
    try:
        conn = get_mkt_db()
        cursor = conn.cursor()
        dev_email = session["dev_user"]
        agent_name = request.form.get("name")
        desc = request.form.get("desc")
        agent_type = request.form.get("type")
        price = request.form.get("price")
        # input fields: JSON string like [{label:"Email", type:"text"}, ...]
        input_fields = request.form.get("inputs")
        if not agent_name or not agent_type or not price or not input_fields:
            return jsonify({"status": 2, "Except": "All fields required"})

        # 1. Insert agent
        cursor.execute(
            "INSERT INTO Agents (developer_email, agent_name, description, agentType, price) VALUES (%s, %s, %s, %s, %s)",
            (dev_email, agent_name, desc, agent_type, float(price))
        )
        conn.commit()

        # 2. Insert input fields
        fields = json.loads(input_fields)
        for field in fields:
            label = field["label"]
            ftype = field["type"]
            cursor.execute(
                "INSERT INTO AgentInputs (agent_name, inputFieldType) VALUES (%s, %s)",
                (agent_name, ftype)
            )
            conn.commit()
            
        cursor.close()
        conn.close()
        return jsonify({"status": 1})
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({"status": 2, "Except": str(e)})

@app.route("/api/market-agents")
def api_market_agents():
    conn = get_mkt_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT agent_id, agent_name, description, agentType, price FROM Agents ORDER BY agent_id DESC"
    )
    agents = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([
        {
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "type": row[3],
            "price": row[4]
        }
        for row in agents
    ])


@app.route("/marketplace")
def marketplace():
    if "marketplace_user" not in session:
        return redirect(url_for("login_page"))
    return render_template("marketplace.html")


@app.route("/register")
def register_page():
    return render_template("register.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/forgot-password")
def forgot_password():
    return render_template("forgot-password.html")

@app.route("/profile")
def profile():
    return render_template("profile.html")

@app.route("/payment", methods=["GET", "POST"])
def payment():
    if request.method == "POST":
        # process payment logic
        pass
    return render_template("payment.html")

@app.route("/developer-register")
def developer_register():
    return render_template("developer-register.html")

@app.route("/blog")
def blog():
    return render_template("blog.html")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
