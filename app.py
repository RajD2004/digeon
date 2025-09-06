from flask import Flask, request, render_template, jsonify, session, redirect, url_for, abort
import mysql.connector
import os
import base64
import json
import hashlib
import requests
import base64
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr


app = Flask(__name__)
app.secret_key = "YOUR_SUPER_SECRET_KEY"

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")           # e.g. your Gmail or SMTP username
SMTP_PASS = os.getenv("SMTP_PASS")           # app password / SMTP password
FROM_NAME = os.getenv("DigeonLLC", "Digeon.ai")
FROM_EMAIL = os.getenv("rajdhull2004@gmail.com", "no-reply@digeon.ai")
# Who receives messages from /api/contact
CONTACT_TO = os.getenv("CONTACT_TO") or os.getenv("SMTP_USER") or "digeon.technologies@gmail.com"
CONTACT_TO_NAME = os.getenv("CONTACT_TO_NAME", "Digeon Contact")



def get_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "mysql"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "digeon"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_NAME", "main_db"),
        connection_timeout=3,
    )

def get_mkt_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "mysql"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "digeon"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_MKT_NAME", "marketplace_db"),
        connection_timeout=3,
    )


def _image_to_dataurl(blob):
    if not blob:
        return None
    # If it's actually text like "data:image..." stored in the BLOB, return as-is
    try:
        txt = blob.decode("utf-8")
        if txt.startswith("data:image"):
            return txt
    except Exception:
        pass
    # Otherwise it's real bytes: base64 it
    return "data:image/png;base64," + base64.b64encode(blob).decode("utf-8")


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

def _render_body_for_user(body_template: str, name: str | None) -> str:
    # personalize {{name}} token
    return body_template.replace("{{name}}", name or "there")

def _send_email(to_name: str | None, to_email: str, subject: str, body_text: str):
    if not (SMTP_USER and SMTP_PASS):
        # Dev mode: no SMTP configured; skip actual send
        print(f"[DEV] Would send to {to_email}: {subject}")
        return True, None

    msg = MIMEText(body_text, _charset="utf-8")
    msg["Subject"] = subject
    msg["From"] = formataddr((FROM_NAME, FROM_EMAIL))
    msg["To"] = formataddr((to_name or to_email, to_email))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
        return True, None
    except Exception as e:
        return False, str(e)

def _newsletter_recipients_for_categories(conn, categories: list[str]):
    """
    Returns list of (user_name, user_email) who opted into ANY of the selected categories.
    """
    if not categories:
        return []

    cur = conn.cursor()
    # distinct on email to avoid dupes when a user matches multiple categories
    q = """
      SELECT DISTINCT u.user_name, u.user_email
      FROM Users u
      JOIN UserCategories uc ON uc.user_email = u.user_email
      WHERE uc.category IN (%s)
    """ % (",".join(["%s"] * len(categories)))
    cur.execute(q, tuple(categories))
    rows = cur.fetchall()
    cur.close()
    return rows

def _delete_blog_row(blog_id: int) -> int:
    """Delete by blog_id. Returns number of rows deleted."""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM Blogs WHERE blog_id = %s", (blog_id,))
        conn.commit()
        return cur.rowcount
    finally:
        cur.close(); conn.close()

def _current_market_user():
    email = session.get("marketplace_user")
    if not email:
        abort(401)
    return email

#APIS

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
    rows = cursor.fetchall()
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
        session["newsletter_signed_up"] = True
        session["newsletter_email"] = email
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
    if not (session.get("newsletter_signed_up") and session.get("newsletter_email")):
        return redirect(url_for("subscribe", next="/directory"))
    return render_template("directory.html")

@app.route("/developer/login")
def developer_login_page():
    return render_template("developer-login.html")


@app.route("/developer/agent-register")
def developer_agent_register_page():
    if "dev_user" not in session:
        return redirect(url_for("developer_login_page"))
    return render_template("agent-register.html")



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
    "SELECT tool_id, tool_name, description, link FROM Tools WHERE category_id = %s ORDER BY tool_name",
    (category_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([
        {"id": row[0], "name": row[1], "desc": row[2], "link": row[3]} for row in rows
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

@app.post("/api/dev-logout")
def dev_logout():
    session.pop("dev_user", None)
    return jsonify({"status": 1})

@app.get("/api/dev/agents")
def api_dev_agents():
    # show agents the logged-in developer has registered
    email = session.get("dev_user")
    if not email:
        return jsonify([]), 401
    conn = get_mkt_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
          SELECT 
            agent_id      AS id,
            agent_name    AS name,
            description   AS description,
            agentType     AS type,
            price         AS price
          FROM Agents
          WHERE developer_email = %s
          ORDER BY agent_id DESC
        """, (email,))
        return jsonify(cur.fetchall())
    finally:
        cur.close(); conn.close()


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
        api_url = request.form.get("api_url")
        # input fields: JSON string like [{label:"Email", type:"text"}, ...]
        input_fields = request.form.get("inputs")
        if not agent_name or not agent_type or not price or not input_fields:
            return jsonify({"status": 2, "Except": "All fields required"})

        # 1. Insert agent
        cursor.execute(
            "INSERT INTO Agents (developer_email, agent_name, description, agentType, price, api_url) VALUES (%s, %s, %s, %s, %s, %s)",
            (dev_email, agent_name, desc, agent_type, float(price), api_url)
        )
        conn.commit()

        # 2. Insert input fields
        fields = json.loads(input_fields)
        for field in fields:
            label = field["label"]
            ftype = field["type"]
            cursor.execute(
                "INSERT INTO AgentInputs (agent_name, inputFieldName, inputFieldType) VALUES (%s, %s, %s)",
                (agent_name, label, ftype)
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

@app.route("/api/run-agent", methods=["POST"])
def run_agent():
    # Accept JSON (text-only) or multipart (files + text)
    if request.is_json:
        payload = request.get_json(silent=True) or {}
        agent_name = payload.get("agent_name")
        out_data = payload.get("inputs", {})  # dict of text inputs
        in_files = None
    else:
        agent_name = request.form.get("agent_name")
        out_data = {k: v for k, v in request.form.items() if k != "agent_name"}
        in_files = request.files  # may be empty

    if not agent_name:
        return jsonify({"status": 0, "error": "agent_name required"})

    # Lookup API URL
    conn = get_mkt_db()
    cursor = conn.cursor()
    cursor.execute("SELECT api_url FROM Agents WHERE agent_name = %s", (agent_name,))
    row = cursor.fetchone()
    cursor.close(); conn.close()
    if not row:
        return jsonify({"status": 0, "error": "Agent not found"})
    api_url = row[0]

    try:
        # Decide whether to try GET or POST first
        REQ_TIMEOUT = (10, 120)
        prefer_get = not (in_files and len(in_files)) and (not out_data or len(out_data) == 0)

        

        def do_get():
            return requests.get(api_url, params=out_data, timeout=REQ_TIMEOUT)

        def do_post():
            if in_files and len(in_files):
                files_out = {
                    k: (f.filename, f.stream, f.mimetype or "application/octet-stream")
                    for k, f in in_files.items() if f and f.filename
                }
                return requests.post(api_url, data=out_data, files=files_out, timeout=REQ_TIMEOUT)
            else:
                return requests.post(api_url, json=out_data, timeout=REQ_TIMEOUT)


        # First attempt
        resp = do_get() if prefer_get else do_post()

        # Retry with the other method if 405
        try:
            resp.raise_for_status()
        except requests.HTTPError:
            if resp.status_code == 405:
                resp = do_post() if prefer_get else do_get()
                resp.raise_for_status()
            else:
                raise

        # --- SUCCESS HANDLING ---
        ct = (resp.headers.get("Content-Type") or "").lower()
        cd = resp.headers.get("Content-Disposition") or ""

        if not ("application/json" in ct or ct.startswith("text/")):
            content = resp.content
            b64 = base64.b64encode(content).decode("ascii")
            filename = "output"
            if "filename=" in cd:
                filename = cd.split("filename=", 1)[1].strip('"; ')
            ext = None
            if "/" in ct:
                _, minor = ct.split("/", 1)
                if minor:
                    ext = minor.split(";")[0].strip()
            if ext and not filename.lower().endswith("." + ext):
                filename = f"{filename}.{ext}"

            return jsonify({
                "status": 1,
                "file": {
                    "filename": filename or "output.bin",
                    "mime": ct or "application/octet-stream",
                    "b64": b64
                }
            })

        try:
            result_obj = resp.json()
            return jsonify({"status": 1, "result": result_obj})
        except Exception:
            return jsonify({"status": 1, "result": resp.text})

    except requests.exceptions.ReadTimeout:
        return jsonify({"status": 0, "error": f"Remote API timed out (> {REQ_TIMEOUT[1]}s). Try smaller files or run again in a few seconds."})
    except Exception as e:
        return jsonify({"status": 0, "error": str(e)})




@app.route("/api/agent-inputs")
def agent_inputs():
    agent_name = request.args.get("agent_name")
    conn = get_mkt_db()
    cursor = conn.cursor()
    cursor.execute("SELECT inputFieldName, inputFieldType FROM AgentInputs WHERE agent_name = %s", (agent_name,))
    fields = [{"label": row[0], "type": row[1]} for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    return jsonify(fields)

@app.route("/api/blogs/<int:blog_id>", methods=["DELETE"])
def api_blog_delete(blog_id):
    try:
        deleted = _delete_blog_row(blog_id)
        if deleted == 0:
            return jsonify({"status": 0, "error": "not found"}), 404
        return jsonify({"status": 1})
    except Exception as e:
        return jsonify({"status": 0, "error": str(e)}), 500

@app.post("/api/blogs/delete")
def api_blog_delete_fallback():
    data = request.get_json(silent=True) or {}
    blog_id = data.get("id") or data.get("blog_id")
    try:
        blog_id = int(blog_id)
    except Exception:
        return jsonify({"status": 0, "error": "invalid id"}), 400

    try:
        deleted = _delete_blog_row(blog_id)
        if deleted == 0:
            return jsonify({"status": 0, "error": "not found"}), 404
        return jsonify({"status": 1})
    except Exception as e:
        return jsonify({"status": 0, "error": str(e)}), 500

@app.get("/api/blogs/<int:blog_id>/likes")
def blog_likes_summary(blog_id):
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM BlogLikes WHERE blog_id=%s", (blog_id,))
        total = int(cur.fetchone()[0])
        liked = False
        user = session.get("marketplace_user")
        if user:
            cur.execute("SELECT 1 FROM BlogLikes WHERE blog_id=%s AND user_email=%s LIMIT 1", (blog_id, user))
            liked = cur.fetchone() is not None
        return jsonify({"count": total, "liked": liked})
    finally:
        cur.close(); conn.close()

@app.post("/api/blogs/<int:blog_id>/like")
def blog_like_toggle(blog_id):
    email = _current_market_user()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM BlogLikes WHERE blog_id=%s AND user_email=%s", (blog_id, email))
        exists = cur.fetchone() is not None
        if exists:
            cur.execute("DELETE FROM BlogLikes WHERE blog_id=%s AND user_email=%s", (blog_id, email))
        else:
            cur.execute("INSERT INTO BlogLikes (blog_id, user_email) VALUES (%s, %s)", (blog_id, email))
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM BlogLikes WHERE blog_id=%s", (blog_id,))
        total = int(cur.fetchone()[0])
        return jsonify({"count": total, "liked": not exists})
    finally:
        cur.close(); conn.close()


@app.get("/api/blogs/<int:blog_id>/comments")
def blog_comments_list(blog_id):
    conn = get_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
          SELECT comment_id, blog_id, user_email, user_name, body, created_at, updated_at
          FROM BlogComments WHERE blog_id=%s ORDER BY comment_id ASC
        """, (blog_id,))
        return jsonify(cur.fetchall())
    finally:
        cur.close(); conn.close()

@app.post("/api/blogs/<int:blog_id>/comments")
def blog_comments_add(blog_id):
    email = _current_market_user()
    data = request.get_json(silent=True) or request.form
    body = (data.get("body") or "").strip()
    user_name = (data.get("user_name") or "").strip() or None
    if not body:
        return jsonify({"status": 0, "error": "comment body required"}), 400
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("""
          INSERT INTO BlogComments (blog_id, user_email, user_name, body)
          VALUES (%s,%s,%s,%s)
        """, (blog_id, email, user_name, body))
        conn.commit()
        return jsonify({"status": 1, "comment_id": cur.lastrowid})
    finally:
        cur.close(); conn.close()


@app.delete("/api/blogs/<int:blog_id>/comments/<int:comment_id>")
def blog_comments_delete(blog_id, comment_id):
    email = _current_market_user()
    conn = get_db(); cur = conn.cursor()
    try:
        cur.execute("""
          DELETE FROM BlogComments
          WHERE comment_id=%s AND blog_id=%s AND user_email=%s
        """, (comment_id, blog_id, email))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({"status": 0, "error": "not found or not allowed"}), 404
        return jsonify({"status": 1})
    finally:
        cur.close(); conn.close()


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
    if "marketplace_user" not in session:
        return redirect(url_for("login_page", next=request.path))
    return render_template("blog.html")

@app.route('/run-agent')
def run_agent_page():
    return render_template('run-agent.html')


@app.route("/api/blogs", methods=["GET", "POST"])
def api_blogs():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    if request.method == "POST":
        data = request.get_json()
        title = data.get("title")
        content = data.get("content")
        image = data.get("imageData")

        # Strip data URL prefix if present
        if image and image.startswith("data:"):
            image = image.split(",", 1)[1]
        
        if image and image.startswith("data:"):
            image = image.split(",", 1)[1]
        
        cursor.execute(
            "INSERT INTO Blogs (title, content, image) VALUES (%s, %s, %s)",
            (title, content, base64.b64decode(image) if image else None)
        )
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"status": 1})

    cursor.execute("SELECT blog_id, title, content, image, created_at FROM Blogs ORDER BY blog_id DESC")
    rows = cursor.fetchall()
    for row in rows:
        row["image"] = _image_to_dataurl(row["image"])
    cursor.close(); conn.close()
    return jsonify(rows)


@app.route('/api/blog/<int:blog_id>')
def api_blog(blog_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Blogs WHERE blog_id = %s", (blog_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        row["image"] = _image_to_dataurl(row["image"])

        return jsonify(row)
    return jsonify({"error": "Blog not found"}), 404


@app.route("/post")
def post_page():
    if "marketplace_user" not in session:
        return redirect(url_for("login_page", next=request.full_path))
    return render_template("post.html")


    
@app.route("/newsletter-create")
def newsletter_create_page():
    
    return render_template("newsletter-create.html")




@app.get("/api/tools/<int:tool_id>/rating")
def get_tool_rating(tool_id):
    """Return average rating, count, and current user's rating (if newsletter session present)."""
    conn = get_db()
    cur  = conn.cursor()

    # Average + count
    cur.execute("SELECT ROUND(AVG(value), 2) AS avg_val, COUNT(*) AS cnt FROM Ratings WHERE tool_id = %s", (tool_id,))
    row = cur.fetchone()
    avg_val = float(row[0]) if row and row[0] is not None else 0.0
    cnt     = int(row[1]) if row else 0

    # Current user's rating (newsletter identity)
    user_val = None
    user_email = session.get("newsletter_email")
    if user_email:
        cur.execute("SELECT value FROM Ratings WHERE tool_id = %s AND user_email = %s", (tool_id, user_email))
        r = cur.fetchone()
        if r:
            user_val = int(r[0])

    cur.close()
    conn.close()
    return jsonify({"avg": avg_val, "count": cnt, "user": user_val})


@app.post("/api/tools/<int:tool_id>/rating")
def set_tool_rating(tool_id):
    """Create/update the current newsletter user's rating for a tool."""
    # Require newsletter session (same gate you use for directory)
    if not session.get("newsletter_signed_up") or not session.get("newsletter_email"):
        return jsonify({"error": "newsletter signup required"}), 401

    data = request.get_json(silent=True) or {}
    try:
        v = int(data.get("value"))
    except Exception:
        v = None

    if v is None or v < 1 or v > 5:
        return jsonify({"error": "value must be an integer 1..5"}), 400

    user_email = session["newsletter_email"]

    conn = get_db()
    cur  = conn.cursor()

    # Upsert on (user_email, tool_id)
    # MySQL 8+ syntax with unique key on (user_email, tool_id)
    cur.execute("""
        INSERT INTO Ratings (user_email, tool_id, value)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP
    """, (user_email, tool_id, v))
    conn.commit()

    # Return fresh summary
    cur.execute("SELECT ROUND(AVG(value), 2) AS avg_val, COUNT(*) AS cnt FROM Ratings WHERE tool_id = %s", (tool_id,))
    row = cur.fetchone()
    avg_val = float(row[0]) if row and row[0] is not None else 0.0
    cnt     = int(row[1]) if row else 0

    cur.close()
    conn.close()
    return jsonify({"avg": avg_val, "count": cnt, "user": v})

@app.post("/api/newsletter/create")
def api_newsletter_create():
    """
    JSON: {subject, body, categories: [..], status: 'draft'|'published' (optional)}
    Saves a post (draft by default) and its category mapping.
    """

    
    data = request.get_json(silent=True) or {}
    subject = (data.get("subject") or "").strip()
    body    = data.get("body") or ""
    cats    = data.get("categories") or []
    status  = data.get("status") or "draft"

    if not subject or not body:
        return jsonify({"status": 2, "error": "subject and body required"}), 400

    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("INSERT INTO NewsletterPosts (subject, body, status) VALUES (%s,%s,%s)", (subject, body, status))
        post_id = cur.lastrowid

        for c in cats:
            cur.execute("INSERT INTO NewsletterPostCategories (post_id, category) VALUES (%s,%s)", (post_id, c))

        conn.commit()
        return jsonify({"status": 1, "post_id": post_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": 2, "error": str(e)}), 500
    finally:
        cur.close(); conn.close()


@app.post("/api/newsletter/publish")
def api_newsletter_publish():
    """
    JSON: {post_id}  OR  {subject, body, categories}
    If post_id is given, loads from DB and sends.
    Otherwise, creates a new 'published' post and sends.
    Records deliveries in NewsletterDeliveries.
    """

    

    data = request.get_json(silent=True) or {}
    post_id = data.get("post_id")

    conn = get_db()
    cur  = conn.cursor(dictionary=True)

    try:
        if post_id:
            cur.execute("""
                SELECT p.post_id, p.subject, p.body
                FROM NewsletterPosts p
                WHERE p.post_id = %s
            """, (post_id,))
            post = cur.fetchone()
            if not post:
                return jsonify({"status": 2, "error": "post not found"}), 404

            cur.execute("SELECT category FROM NewsletterPostCategories WHERE post_id = %s", (post_id,))
            cats = [r[0] for r in cur.fetchall()]
            subject, body = post["subject"], post["body"]
        else:
            # create a published post on the fly
            subject = (data.get("subject") or "").strip()
            body    = data.get("body") or ""
            cats    = data.get("categories") or []
            if not subject or not body or not cats:
                return jsonify({"status": 2, "error": "subject, body, categories required"}), 400

            cur.execute("INSERT INTO NewsletterPosts (subject, body, status, published_at) VALUES (%s,%s,'published', NOW())", (subject, body))
            post_id = cur.lastrowid
            for c in cats:
                cur.execute("INSERT INTO NewsletterPostCategories (post_id, category) VALUES (%s,%s)", (post_id, c))
            conn.commit()

        # load recipients
        recipients = _newsletter_recipients_for_categories(conn, cats)
        sent_ok = 0
        sent_fail = 0

        # send + record delivery rows
        for (name, email) in recipients:
            personalized = _render_body_for_user(body, name)
            ok, err = _send_email(name, email, subject, personalized)
            if ok:
                sent_ok += 1
                cur.execute("INSERT INTO NewsletterDeliveries (post_id, user_email, success) VALUES (%s,%s,1)", (post_id, email))
            else:
                sent_fail += 1
                cur.execute("INSERT INTO NewsletterDeliveries (post_id, user_email, success, error_text) VALUES (%s,%s,0,%s)", (post_id, email, err))
        # ensure post is marked published
        cur.execute("UPDATE NewsletterPosts SET status='published', published_at = COALESCE(published_at, NOW()) WHERE post_id=%s", (post_id,))
        conn.commit()

        return jsonify({"status": 1, "post_id": post_id, "sent": sent_ok, "failed": sent_fail})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": 2, "error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route("/contact")
def contact():
    return render_template("contact.html")

@app.post("/api/contact")
def api_contact():
    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    message = (data.get("message") or "").strip()

    if not (name and email and phone and message):
        return jsonify({"ok": False, "error": "All fields required"}), 400

    subject = f"[Contact] New message from {name}"
    body = (
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"Phone: {phone}\n\n"
        f"Message:\n{message}\n"
    )

    # Always send to YOU (site owner)
    ok, err = _send_email("Digeon Admin", "digeon.technologies@gmail.com", subject, body)
    if not ok:
        return jsonify({"ok": False, "error": err}), 500

    return jsonify({"ok": True})

# --- Developer Portal integration ---
@app.post("/api/purchase")
def api_purchase():
    email = session.get("marketplace_user")
    if not email:
        return jsonify({"status": 0, "error": "login required"}), 401
    agent_name = request.form.get("agent_name") or (request.json or {}).get("agent_name")
    if not agent_name:
        return jsonify({"status": 0, "error": "agent_name required"}), 400

    conn = get_mkt_db(); cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO Purchases (user_email, agent_name)
            VALUES (%s,%s)
            ON DUPLICATE KEY UPDATE purchased_at=NOW()
        """, (email, agent_name))
        conn.commit()
        return jsonify({"status": 1})
    finally:
        cur.close(); conn.close()


@app.get("/api/my-agents")
def api_my_agents():
    # show user’s purchased agents (accept marketplace_user OR dev_user identity)
    email = session.get("marketplace_user") or session.get("dev_user")
    if not email:
        return jsonify([]), 401
    conn = get_mkt_db(); cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
          SELECT a.agent_id, a.agent_name AS name, a.description, a.agentType AS type, a.price
          FROM Purchases p
          JOIN Agents a ON a.agent_name = p.agent_name
          WHERE p.user_email=%s
          ORDER BY p.purchased_at DESC
        """, (email,))
        return jsonify(cur.fetchall())
    finally:
        cur.close(); conn.close()

@app.get("/developer")
def developer_dashboard():
    # require dev login (keeps your existing flow)
    if "dev_user" not in session:
        return redirect(url_for("developer_login_page", next="/developer"))
    # render YOUR dashboard file
    return render_template("developer-dashboard.html")


@app.route("/ops-9c1f0a6b7d2e4c8a3f1b9d7e5c2a0f4e", endpoint="admin_page")
def admin_page():
    return render_template("admin-dashboard.html")

@app.get("/api/newsletter/posts")
def api_newsletter_posts():
    
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
      SELECT post_id, subject, status,
             COALESCE(updated_at, published_at, created_at) AS updated_at
      FROM NewsletterPosts
      ORDER BY COALESCE(updated_at, published_at, created_at) DESC
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(rows)


@app.route("/<path:page>.html")
def html_alias(page):
    return redirect(f"/{page}", code=301)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
