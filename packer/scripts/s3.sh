#!/bin/bash

address=$1


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