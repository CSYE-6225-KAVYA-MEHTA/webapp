packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0, < 2.0.0"
      source  = "github.com/hashicorp/amazon" #
    }
  }
}

variable "aws_region" {
  default = env("AWS_REGION")
}


variable "ami_name" {
  type    = string
  default = "CSYE-6225"
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}

variable "AWS_ACCESS_KEY" {
  type    = string
  default = ""
}

variable "AWS_SECRET_KEY" {
  type    = string
  default = ""
}


variable "source_ami" {
  type    = string
  default = "ami-04b4f1a9cf54c11d0"
}

variable "security_group_id" {
  type    = string
  default = "sg-02578332a57774942"
}

variable "ssh_username" {
  type    = string
  default = "ubuntu"
}

variable "subnet_id" {
  type    = string
  default = "subnet-08d27cf78fa1b9164"
}

variable "vpc_id" {
  type    = string
  default = "vpc-047cf1baaf97b19cc"
}

variable "dev_user" {
  type    = string
  default = "248189920505"
}

variable "demo_user" {
  type    = string
  default = "699475940666"
}

locals {
  timestamp = formatdate("YYYYMMDDHHmmss", timestamp())
}

variable "volume_size" {
  type    = number
  default = 25
}

variable "db_username" {
  type      = string
  sensitive = true
  default   = env("DB_USERNAME")
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = env("DB_PASSWORD")
}

variable "db_database" {
  type      = string
  sensitive = true
  default   = env("DB_DATABASE")
}

variable "db_host" {
  type    = string
  default = env("DB_HOST")
}

variable "port" {
  type    = string
  default = env("PORT")
}

source "amazon-ebs" "ubuntu" {
  ami_name        = "${var.ami_name}-${local.timestamp}"
  ami_description = "AMI for CSYE6225 A04 KAVYA MEHTA"
  ami_regions     = ["us-east-1"]
  ami_users       = [var.dev_user]
  instance_type   = var.instance_type
  region          = var.aws_region
  access_key      = var.AWS_ACCESS_KEY # Reference the access key variable
  secret_key      = var.AWS_SECRET_KEY # Reference the secret key variable

  source_ami        = var.source_ami
  ssh_interface     = "public_ip"
  ssh_username      = var.ssh_username
  subnet_id         = var.subnet_id
  vpc_id            = var.vpc_id
  security_group_id = var.security_group_id

  launch_block_device_mappings {
    delete_on_termination = true
    device_name           = "/dev/sda1"
    volume_size           = 25
    volume_type           = "gp2"
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu"]


  provisioner "file" {
    source      = "./webapp.zip" # Copy the entire webapp codebase
    destination = "/tmp/webapp.zip"
  }

  provisioner "file" {
    source      = "application.service" # Copy the entire webapp codebase
    destination = "/tmp/application.service"
  }


  provisioner "shell" {
    inline = [
      "cat <<EOF | sudo tee /tmp/.env",
      "DB_NAME=${var.db_database}",
      "DB_USER=${var.db_username}",
      "DB_PASSWORD=${var.db_password}",
      "EOF"
    ]
  }

  
  provisioner "shell" {
    inline = [
      "echo 'Verifying file transfer...'",

      "echo 'Listing /tmp directory after file provisioner:'",
      "ls -al /tmp", # List files in /tmp to check if webapp.zip and application.service exist

      "if [ -f /tmp/webapp.zip ]; then echo 'webapp.zip copied successfully!'; else echo 'ERROR: webapp.zip NOT found in /tmp'; exit 1; fi",
      "if [ -f /tmp/application.service ]; then echo 'application.service copied successfully!'; else echo 'ERROR: application.service NOT found in /tmp'; exit 1; fi",

      "echo 'File verification completed.'",

      "sudo apt-get update -y",
      "sudo apt-get install -y unzip",

      "echo 'Creating user and group csye6225'",
      "sudo groupadd csye6225 || echo 'Group already exists'",
      "sudo useradd -s /bin/false -g csye6225 -d /opt/csye6225 -m csye6225", # Ensure the user and home directory exist

      # Install Node.js
      "echo '🛠 Installing Node.js v20...'",
      "sudo apt-get install -y curl",                                      # Install curl if not already installed
      "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -", # Use Node.js 20 setup script
      "sudo apt-get install -y nodejs",                                    # Install Node.js 20.x
      "sudo npm install -g npm@latest",                                    # Install the latest npm version

      "node -v", # Verify Node.js installation
      "npm -v",  # Verify npm installation
      "sudo npm install dotenv",

      "echo 'Installing MySQL...'",
      "sudo apt-get install mysql-server -y",
      "sudo systemctl start mysql",
      "sudo systemctl enable mysql",

      "echo 'Creating Database...'",
      "sudo mysql -e \"CREATE DATABASE IF NOT EXISTS Health_Check;\"",
      "sudo mysql -e \"CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY 'root';\"",
      "sudo mysql -e \"GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;\"",
      "sudo mysql -e \"FLUSH PRIVILEGES;\"",


      "echo 'Moving application service file...'",
      "sudo mv /tmp/application.service /etc/systemd/system/",
      "sudo chmod 644 /etc/systemd/system/application.service",

      "echo 'Creating /opt/csye6225 directory'",
      "sudo mkdir -p /opt/csye6225",
      "sudo chown csye6225:csye6225 /opt/csye6225",
      "sudo chmod 755 /opt/csye6225",

      "echo 'Moving webapp.zip...'",
      "if [ -f /tmp/webapp.zip ]; then sudo mv /tmp/webapp.zip /opt/csye6225/ && echo 'webapp.zip moved to /opt/csye6225/'; else echo 'Error: /tmp/webapp.zip not found' && ls -l /tmp/ && exit 1; fi",


      "echo 'Moving application service file...'",
      "sudo mv /tmp/.env /opt/csye6225/",

      "sudo chown -R csye6225:csye6225 /opt/csye6225",
      "sudo chmod 755 /opt/csye6225/webapp.zip",

      "echo 'Unzipping webapp.zip...'",
      "cd /opt/csye6225",
      "sudo unzip webapp.zip",
      "ls -al",

      "echo 'Setting ownership of files after unzipping'",
      "sudo chown -R csye6225:csye6225 /opt/csye6225",
      "sudo chmod -R 755 /opt/csye6225",

      "echo 'Running npm install'",
      "cd /opt/csye6225",
      "sudo -u csye6225 npm install",

      "sudo systemctl daemon-reload",
      "sudo systemctl enable application",
      "sudo systemctl start application",

      "echo 'Service application started successfully'"
    ]
  }

  
}
