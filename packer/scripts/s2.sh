#!/bin/bash

echo "Setting non-interactive mode for apt..."
export DEBIAN_FRONTEND=noninteractive

echo "Updating package lists..."
sudo apt-get update -y

echo "Installing MySQL Server..."
sudo apt-get install -y mysql-server mysql-client --allow-downgrades --allow-change-held-packages --no-install-recommends > /dev/null 2>&1

echo "Securing MySQL installation..."
sudo systemctl start mysql
sudo systemctl enable mysql

echo "MySQL installation completed successfully!"
