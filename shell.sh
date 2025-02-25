#!/bin/bash

sudo apt-get update -y
sudo apt-get install -y unzip
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 
sudo apt install -y nodejs
sudo apt-get install -y mysql-server
echo"Installed MYSQL"
sudo npm -v
npm install dotenv

npm install express sequelize mysql2 dotenv
sudo groupadd csye6225


# echo "++++++++++++CHECK WHAT IS THE DATABASE NAME?: $DB_DATABASE"
# sudo mysql -u root -e "CREATE database IF NOT EXISTS ${DB_DATABASE};"
 
# echo "-------Securing MySQL Installation and Granting Permissions-------"
# sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
# echo ""++++++++++++CHECK WHAT IS THE USERNAME NAME?: $DB_USERNAME"
# echo ""++++++++++++CHECK WHAT IS THE PASSWORD NAME?: $DB_PASSWORD"
# sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO '${DB_USERNAME}'@'localhost' WITH GRANT OPTION;"
# sudo mysql -e "FLUSH PRIVILEGES;"


echo "-------Creating Database-------"
echo "++++++++++++CHECK WHAT IS THE DATABASE NAME?: $DB_DATABASE"
sudo mysql -u root -e "CREATE database IF NOT EXISTS ${DB_DATABASE};"
 
echo "-------Securing MySQL Installation and Granting Permissions-------"
sudo mysql -e "CREATE USER IF NOT EXISTS 'kavya'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
echo "++++++++++++CHECK WHAT IS THE PASSWORD NAME?: $DB_PASSWORD"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'kavya'@'localhost' WITH GRANT OPTION;"
sudo mysql -e "FLUSH PRIVILEGES;"



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