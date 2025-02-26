#!/bin/bash

echo "-------Moving webapp.service file-------"
sudo mv /opt/csye6225/packer/webapp.service /etc/systemd/system/webapp.service

echo "-------Reloading systemd-------"
sudo systemctl daemon-reload

echo "-------Enabling webapp.service-------"
sudo systemctl enable webapp.service

echo "-------Starting webapp.service-------"
sudo systemctl start webapp.service

echo "-------Checking webapp.service status-------"
sudo systemctl status webapp.service

echo "-------Viewing webapp.service logs-------"
sudo journalctl -u webapp.service --no-pager