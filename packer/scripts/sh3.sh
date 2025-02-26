#!/bin/bash

echo "-------Creating the webapp binary directory-------"
sudo mkdir -p /opt/csye6225
sudo chown csye6225:csye6225 /opt/csye6225
sudo mv /tmp/webapp.zip /opt/csye6225/

echo "-------Setting read permissions-------"
sudo chown -R csye6225:csye6225 /opt/csye6225/
pwd 
sudo chmod 755 /opt/csye6225
cd /opt/csye6225
pwd
# sudo unzip -v webapp.zip
sudo unzip webapp.zip
ls
pwd
echo "Current Directory owner: $(ls -ld . | awk '{print $3}')"
echo "Current Directory: $(pwd)"
echo "Unzipped contents:"
ls -al

echo "=============Setting Read and Excetute permissions for the directory============="
sudo chmod 755 /opt/csye6225

