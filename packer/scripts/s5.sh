#!/bin/bash

echo "Changing to the webapp directory..."
cd /opt/csye6225/webapp || { echo "ERROR: Failed to change directory"; exit 1; }

echo "Running npm install..."
sudo -u CSYE_6225_USER npm install --unsafe-perm || { echo "ERROR: npm install failed"; exit 1; }

echo "Starting the application..."
sudo -u CSYE_6225_USER npm start || { echo "ERROR: npm start failed"; exit 1; }
