packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.8"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "ami_users" {
  type    = list(string)
  default = []
}

# Define variables
variable "db_name" {
  type    = string
  default = "Health_Check"
}

variable "db_user" {
  type    = string
  default = "kavya"
}

variable "db_password" {
  type    = string
  default = "root"
}



variable "aws_region" {
  type    = string
  default = "us-east-1" # Specify your AWS region
}

variable "source_ami" {
  type    = string
  default = "ami-04b4f1a9cf54c11d0" # Default Ubuntu AMI, can be replaced with your preferred one
}

variable "ssh_username" {
  type    = string
  default = "ubuntu"
}

variable "subnet_id" {
  type    = string
  default = "subnet-08d27cf78fa1b9164" # Example subnet, replace with your subnet
}

variable "aws_access_key" {
  type = string
  default=""
}

variable "aws_secret_key" {
  type = string
  default=""
}

locals {
  sanitized_timestamp = replace(timestamp(), ":", "-") # Replace colons with dashes to make it valid
}

source "amazon-ebs" "my-ami" {
  region          = var.aws_region
  ami_name        = "csye6225-custom-webapp-${local.sanitized_timestamp}"
  ami_description = "AMI for CSYE 6225 - Custom Web App"

  ami_regions = [
    "us-east-1"
  ]

  access_key = var.aws_access_key # Reference the access key variable
  secret_key = var.aws_secret_key # Reference the secret key variable

  ami_users = var.ami_users

  aws_polling {
    delay_seconds = 120
    max_attempts  = 50
  }

  instance_type = "t2.small"
  source_ami    = var.source_ami
  ssh_username  = var.ssh_username
  subnet_id     = var.subnet_id

  launch_block_device_mappings {
    delete_on_termination = true
    device_name           = "/dev/sda1"
    volume_size           = 8
    volume_type           = "gp2"
  }
}

build {
  sources = ["source.amazon-ebs.my-ami"]


  provisioner "file" {
    source      = "./webapp.zip" # Copy the entire webapp codebase
    destination = "/tmp/webapp.zip"
  }
  provisioner "file" {
    source      = "./application.service" # Copy the entire webapp codebase
    destination = "/tmp/application.service"
  }

  // # Run the createDatabase.sh script
  // provisioner "shell" {
  //   inline = [
  //     ""
  //   ]
  // }

  provisioner "shell" {
    inline = [
      "set -ex",
      "cd /tmp/",
      "ls -al",
      // "sudo apt-get update -y",
      "sudo apt-get install -y unzip",
      "echo 'Creating user and group csye6225'",
      "sudo groupadd csye6225 || echo 'Group already exists'",
      "sudo useradd -s /bin/false -g csye6225 -d /opt/csye6225 -m csye6225", # Ensure the user and home directory exist

      # Install Node.js 18.x
      "sudo apt-get install -y curl",                                      # Install curl if not already installed
      "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -", # Use Node.js 18 setup script
      "sudo apt-get install -y nodejs",                                    # Install Node.js 18.x
      "sudo npm install -g npm@latest",                                    # Install the latest version of npm compatible with Node.js 18.x",

      "node -v", # Verify Node.js installation
      "npm -v",  # Verify npm installation

      # Install MySQL
      "sudo apt-get install -y mysql-server unzip", # Install MySQL and unzip
      "sudo systemctl enable mysql",                # Ensure MySQL starts on boot
      "sudo systemctl start mysql",                 # Start MySQL

      # Create database and user with privileges using sudo (no root password needed)
      "sudo mysql --execute=\"CREATE DATABASE IF NOT EXISTS ${var.db_name};\"",
      "sudo mysql --execute=\"CREATE USER IF NOT EXISTS '${var.db_user}'@'%' IDENTIFIED BY '${var.db_password}';\"",
      "sudo mysql --execute=\"GRANT ALL PRIVILEGES ON ${var.db_name}.* TO '${var.db_user}'@'%';\"",
      "sudo mysql --execute=\"FLUSH PRIVILEGES;\"",
      "echo 'Move application started'",
      "sudo mv /tmp/application.service /etc/systemd/system",
      "sudo chmod 644 /etc/systemd/system/application.service",
      "echo 'Move application completed'",

      # Create /opt/csye6225 directory and set permissions
      "echo 'Creating /opt/csye6225 directory'",
      "sudo mkdir -p /opt/csye6225",
      "sudo chown csye6225:csye6225 /opt/csye6225", # Set ownership to csye6225
      "sudo chmod 755 /opt/csye6225",               # Ensure the directory is accessible and executable
      "echo 'Switching to csye6225 user and moving webapp.zip'",
      "if [ -f /tmp/webapp.zip ]; then sudo mv /tmp/webapp.zip /opt/csye6225/ && echo 'webapp.zip moved to /opt/csye6225/'; else echo 'Error: /tmp/webapp.zip not found' && ls -l /tmp/ && exit 1; fi",

      "sudo chown -R csye6225:csye6225 /opt/csye6225",
      "sudo chmod 755 /opt/csye6225/webapp.zip",

      "echo 'Unzipping webapp.zip as csye6225'",
      "sudo chown -R csye6225:csye6225 /opt/csye6225", # Ensure ownership is set correctly
      "sudo chmod -R 755 /opt/csye6225",
      "cd /opt/csye6225",
      "ls -al",
      "sudo unzip webapp.zip",
      "cd /opt/csye6225/",
      "ls -al",
      "echo 'Finished unzip operation'",

      "echo 'Setting ownership of files after unzipping'",
      "sudo chown -R csye6225:csye6225 /opt/csye6225/", # Ensure ownership is set correctly
      "sudo chmod -R 755 /opt/csye6225/",               # Ensure all files in /opt/csye6225 are accessible and executable

      # Run npm install as csye6225
      "echo 'Running npm install as csye6225'",
      "sudo npm install", # Install npm packages as csye6225
      "sudo systemctl daemon-reload",
      "sudo systemctl enable application",
      "sudo systemctl start application",


      # Debugging to verify directory structure and files
      "echo 'Debugging the directory after npm install'",

    ]
  }


}



