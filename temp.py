import mysql.connector
conn = mysql.connector.connect(
    host="127.0.0.1",   # or "localhost"
    user="root",
    password="Row90bit_20041803-2022-2026"`,  # put your actual root password here
    database="main_db"`
)
print(conn.is_connected())
conn.close()
