# Kavya Mehta

CSYE 6225

# Requirements

Server Operating System: Windows
Programming Language: JavaScript
Relational Database: MySQL
Backend Framework: NodeJS
ORM Framework:Sequelize

### 1. Install Dependencies

Install the dependencies required for the project:

```bash
npm install
```

### 2. Set Up the Database

Ensure that MySQL is installed and running on your local machine. Update the `.env` file with your database credentials.

You may need to create the database manually.

For MySQL: "Create database health_check"

### 3. Running the Application Locally

Once everything is set up, start the application:

```bash
npm start
```

# ASSIGNMENT 2 STEPS

### Start server

ssh -i ~/.ssh/do root@"your_address"

### Copy files from local to server

scp -i ~/.ssh/do "zip_file_name".zip root@"your_address":/root

scp -i ~/.ssh/do "shell_script_name".sh root@"your_address":/root

### Give permission to setup.sh

chmod +x setup.sh

### Run shell script

sudo ./"shell_script_name".sh

