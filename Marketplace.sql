CREATE TABLE users(
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL

);

CREATE TABLE market(
    product_id INTEGER PRIMARY KEY AUTOINCREMENT, 
    product_name TEXT NOT NULL,
    product_price REAL,
    api_link TEXT NOT NULL,
    fields TEXT
);

CREATE TABLE developers(
    developer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
);

CREATE TABLE Agents(
    agent_id INTEGER PRIMARY KEY AUTOINCREMENT,
    developer_email TEXT NOT NULL,
    agent_name TEXT NOT NULL UNIQUE,
    description TEXT,
    agentType TEXT NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (developer_email) REFERENCES developers(email)
);

CREATE TABLE AgentInputs(
    AgInID INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,
    inputFieldType TEXT NOT NULL,
    FOREIGN KEY (agent_name) REFERENCES Agents(agent_name)
);
