#!/bin/bash

echo "-------Updating Package Repository-------"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "-------Installing Required Packages-------"
# Install MySQL Server with proper handling for dependencies
sudo apt-get install -y mysql-server-8.0 || sudo apt-get install -y mysql-server
sudo apt-get install -y unzip

# Verify MySQL installation
if ! command -v mysql &> /dev/null; then
  echo "MySQL installation failed!"
  exit 1
fi


echo "-------Starting MySQL Service and Creating Database-------"
sudo systemctl start mysql
sudo systemctl enable mysql

echo "-------Creating Database-------"
echo "++++++++++++CHECK WHAT IS THE DATABASE NAME?: $DB_DATABASE"
sudo mysql -u root -e "CREATE database IF NOT EXISTS ${DB_DATABASE};"

echo "-------Securing MySQL Installation and Granting Permissions-------"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
echo ""++++++++++++CHECK WHAT IS THE USERNAME NAME?: $DB_USERNAME"
echo ""++++++++++++CHECK WHAT IS THE PASSWORD NAME?: $DB_PASSWORD"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO '${DB_USERNAME}'@'localhost' WITH GRANT OPTION;"
sudo mysql -e "FLUSH PRIVILEGES;"