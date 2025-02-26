#!/bin/bash

source /tmp/.env

# Update and install dependencies
sudo apt-get update -y
sudo apt-get install -y unzip
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 
sudo apt install -y nodejs
sudo apt-get install -y mysql-server
sudo npm -v
npm install dotenv

npm install express sequelize mysql2 dotenv
sudo groupadd csye6225

echo "-------Creating Database-------"

echo $DB_NAME
echo $DB_PASSWORD
echo $DB_USER

# Create database
sudo mysql -u root -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"
 
echo "-------Securing MySQL Installation and Granting Permissions-------"
# Fixed: Create the correct user and grant proper permissions
sudo mysql -e "CREATE USER IF NOT EXISTS 'kavya'@'%' IDENTIFIED BY '$DB_PASSWORD';"
sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO 'kavya'@'%';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Configure MySQL to listen on all interfaces - this helps with connection issues
sudo sed -i 's/bind-address.*=.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql

# Copy files to the right locations
sudo cp /tmp/application.service /etc/systemd/system/
sudo cp /tmp/webapp.zip /opt/
sudo unzip /opt/webapp.zip -d /opt/webapp

cd /opt/webapp || exit

cat <<EOF | sudo tee /tmp/.env,
DB_NAME=$DB_NAME
DB_USER=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD
DB_HOST=localhost
PORT=8080
EOF

sudo cp /tmp/.env /opt/webapp



# Create user and set permissions
sudo useradd -g csye6225 -s /usr/sbin/nologin csye6225 || echo "User already exists"
echo "csye6225 ALL=(ALL:ALL) NOPASSWD: /bin/systemctl" | sudo EDITOR='tee -a' visudo

# Set proper permissions for all files
sudo chown -R csye6225:csye6225 /opt/webapp
sudo chmod -R 755 /opt/webapp
sudo chown csye6225:csye6225 .env
sudo npm install
sudo chown -R csye6225:csye6225 node_modules

# Create the log files mentioned in application.service
sudo touch /var/log/webapp_output.log /var/log/webapp_error.log
sudo chown csye6225:csye6225 /var/log/webapp_output.log /var/log/webapp_error.log

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable application
sudo systemctl start application

echo "Setup completed"