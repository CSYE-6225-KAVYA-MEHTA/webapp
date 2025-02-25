#!/bin/bash

sudo apt-get update -y
sudo apt-get install -y unzip
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 
sudo apt install -y nodejs
sudo apt-get install -y mysql-server
sudo node -v
sudo npm -v
npm install dotenv

npm install express sequelize mysql2 dotenv
sudo groupadd csye6225

echo "ALTER USER 'kavya'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD'; 
FLUSH PRIVILEGES; 
CREATE DATABASE Health_Check;" | sudo mysql


sudo cp /tmp/application.service /etc/systemd/system/
sudo cp /tmp/webapp.zip /opt/
sudo unzip /opt/webapp.zip -d /opt/webapp
sudo cp /tmp/.env /opt/webapp


cd /opt/webapp || exit


sudo useradd -g csye6225 -s /usr/sbin/nologin csye6225
echo "csye6225 ALL=(ALL:ALL) NOPASSWD: /bin/systemctl" | sudo EDITOR='tee -a' visudo
sudo chown -R csye6225:csye6225 /tmp/webapp.zip

      # Extract webapp and set up the systemd service
sudo chown -R csye6225:csye6225 /opt/webapp
sudo chmod -R 755 /opt/webapp
sudo chown csye6225:csye6225 .env
sudo npm install
sudo chown csye6225:csye6225 node_modules

echo "Setup completed"