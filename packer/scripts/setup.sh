#!/bin/bash
echo "SYSTEM UPDATE"
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y unzip

sudo apt-get clean

echo "CREATE CSYE6225 GROUP AND USER"
sudo groupadd csye6225 || echo "Group already exists"
sudo useradd -s /sbin/nologin -M -g csye6225 csye6225 || echo "User already exists"

echo "UPDATE AGAIN"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "INSTALL PACKAGES"

# sudo apt-get install -y mysql-server-8.0 || sudo apt-get install -y mysql-server
sudo apt-get install -y unzip



# echo "START SQL"
# sudo systemctl start mysql
# sudo systemctl enable mysql

# echo "CREATE DB"
# echo $DB_DATABASE
# echo $DB_USERNAME
# echo $DB_PASSWORD
# sudo mysql -u root -e "CREATE database IF NOT EXISTS ${DB_DATABASE};"

# echo "GRANT PERMISSION"
# sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"

# sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO '${DB_USERNAME}'@'localhost' WITH GRANT OPTION;"
# sudo mysql -e "FLUSH PRIVILEGES;"



sudo mkdir -p /opt/csye6225
sudo chown csye6225:csye6225 /opt/csye6225
sudo mv /tmp/webapp.zip /opt/csye6225/

echo "PERMISSION SETUP"
sudo chown -R csye6225:csye6225 /opt/csye6225/
pwd 
sudo chmod 755 /opt/csye6225
cd /opt/csye6225
pwd


sudo unzip webapp.zip
ls
pwd


echo "DIRECTORY PERMISSION"
sudo chmod 755 /opt/csye6225


echo "INSTALL"

sudo apt-get install -y nodejs
sudo apt-get install -y npm

sudo chown -R ubuntu:ubuntu /opt/csye6225
cd /opt/csye6225 || exit 1

sudo npm install 
sudo npm install dotenv

# echo "CREATE .ENV"
# cat << EOF > .env
# SERVER_PORT=${SERVER_PORT}
# DB_HOST=${DB_HOST}
# DB_USERNAME=${DB_USERNAME}
# DB_PASSWORD=${DB_PASSWORD}
# DB_DATABASE=${DB_DATABASE}
# EOF

sudo mv /opt/csye6225/packer/webapp.service /etc/systemd/system/webapp.service

sudo systemctl daemon-reload

sudo systemctl enable webapp.service

sudo systemctl start webapp.service

sudo systemctl status webapp.service

sudo journalctl -u webapp.service --no-pager