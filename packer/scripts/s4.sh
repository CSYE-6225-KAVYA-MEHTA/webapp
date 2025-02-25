#!/bin/bash

echo "Creating Linux group for the application..."
sudo groupadd CSYE_6225_GROUP || echo "Group already exists."

echo "Creating a new user for the application..."
sudo useradd -m -s /bin/bash -g CSYE_6225_GROUP CSYE_6225_USER || echo "User already exists."

echo "Make a new directory and Unzipping the web application..."
sudo mkdir -p /opt/csye6225
sudo unzip -o /tmp/webapp.zip -d /opt/csye6225/webapp

echo "Updating permissions for the application directory..."
sudo chown -R CSYE_6225_USER:CSYE_6225_GROUP /opt/csye6225
sudo chmod -R 755 /opt/csye6225