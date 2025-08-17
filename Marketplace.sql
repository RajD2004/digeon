DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS market;
DROP TABLE IF EXISTS developers;
DROP TABLE IF EXISTS Agents;
DROP TABLE IF EXISTS AgentInputs;


CREATE TABLE users(
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
);

CREATE TABLE market(
    product_id INT AUTO_INCREMENT PRIMARY KEY, 
    product_name VARCHAR(255) NOT NULL,
    product_price FLOAT,
    api_link VARCHAR(255) NOT NULL,
    fields TEXT
);

CREATE TABLE developers(
    developer_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
);

CREATE TABLE Agents(
    agent_id INT AUTO_INCREMENT PRIMARY KEY,
    developer_email VARCHAR(255) NOT NULL,
    agent_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    agentType VARCHAR(255) NOT NULL,
    price FLOAT NOT NULL,
    api_url VARCHAR(512),
    FOREIGN KEY (developer_email) REFERENCES developers(email)
);

CREATE TABLE AgentInputs(
    AgInID INT AUTO_INCREMENT PRIMARY KEY,
    agent_name VARCHAR(255) NOT NULL,
    inputFieldName VARCHAR(255) NOT NULL,
    inputFieldType VARCHAR(255) NOT NULL,
    FOREIGN KEY (agent_name) REFERENCES Agents(agent_name)
);
