#!/bin/bash

address=$1


echo "Updating package lists..."
sudo apt update -y

echo "Upgrading system packages..."
sudo apt upgrade -y

echo "Installing MySQL..."
sudo apt install mysql-server -y

sudo apt install -y unzip
sudo apt install -y nodejs
sudo apt install -y npm

sudo systemctl start mysql
sudo systemctl enable mysql

echo "Creating Databse..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS Health_Check;"

# sudo mysql -u root -p
sudo mysql -e "CREATE USER IF NOT EXISTS 'root'@'${address}' IDENTIFIED BY 'root';"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'${address}' WITH GRANT OPTION;"
sudo mysql -e "FLUSH PRIVILEGES;"


# Update MySQL bind-address to allow remote connections
sudo sed -i 's/^bind-address\s*=.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf


sudo systemctl restart mysql

echo "Creating Linux group for the application..."
sudo groupadd CSYE_6225_GROUP || echo "Group already exists."

echo "Creating a new user for the application..."
sudo useradd -m -s /bin/bash -g CSYE_6225_GROUP CSYE_6225_USER || echo "User already exists."

echo "Make a new directory and Unzipping the web application..."
sudo mkdir -p /opt/csye6225
sudo unzip -o webapp-demo.zip -d /opt/csye6225

echo "Updating permissions for the application directory..."
sudo chown -R CSYE_6225_USER:CSYE_6225_GROUP /opt/csye6225
sudo chmod -R 750 /opt/csye6225

echo "Setup complete! The application is now installed in /opt/csye6225."

echo "-------Installing Node.js Project Dependencies-------"
cd /opt/csye6225/Kavya_Mehta_002312158_02 || exit 1
npm install --unsafe-perm

echo "-------Starting the Application-------"
sudo -u csye6225 npm start &