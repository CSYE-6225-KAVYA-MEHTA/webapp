

















echo "Setup complete! The application is now installed in /opt/csye6225."

echo "-------Installing Node.js Project Dependencies-------"
cd /opt/csye6225/webapp || exit 1
sudo -u csye_6225_user npm install --unsafe-perm