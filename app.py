from flask import Flask, request
import requests
import sqlite3

app = Flask(__name__)
sql_file = "database.sql"
db_file = "database.db"

'''
1. api for log user
2. api for display for category
3. api display default 
'''
dbExist = False

def create_db():
    if not dbExist:
        conn = sqlite3.connect(db_file)
        with conn:
            cursor = conn.cursor()
            cursor.executescript(sql_file)
        
        global dbExist
        dbExist = True

        return conn

def get_db():
    if not dbExist:
        conn = create_db()
    
    else:
        conn = sqlite3.connect(db_file)
    
    return conn

@app.route("/")
def index():
    pass

@app.route("/home")
def home():
    pass

@app.route("/subscribe", methods = ["POST"])
def subscribe():
    pass

@app.route("/ai-tools-directory", methods = ["GET"])
def view_tools():
    pass

if __name__ in "__main__":
    app.run(debug=True)