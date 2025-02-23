packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0, < 2.0.0"
      source  = "github.com/hashicorp/amazon"
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

variable "access_key" {
  type      = string
  default   = env("AWS_ACCESS_KEY_ID")
  sensitive = true
}

variable "secret_key" {
  type      = string
  default   = env("AWS_SECRET_ACCESS_KEY")
  sensitive = true
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
  ami_name          = "${var.ami_name}-${local.timestamp}"
  ami_description   = "AMI for CSYE6225 A04 KAVYA MEHTA"
  ami_regions       = ["us-east-1"]
  ami_users         = [var.dev_user]
  instance_type     = var.instance_type
  region            = var.aws_region
  access_key        = var.access_key
  secret_key        = var.secret_key
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
  source      = "C:/Users/kavya/Downloads/webapp-demo.zip"  // Path to your webapp zip file on your local machine
  destination = "/home/ubuntu/webapp-demo.zip"
}

  provisioner "file" {
    source = "scripts/setup.sh"

    destination = "/home/ubuntu/setup.sh"
  }


  # provisioner "shell" {
  #   inline = [
  #     "export DB_DATABASE=${var.db_database}",
  #     "export DB_USERNAME=${var.db_username}",
  #     "export DB_PASSWORD=${var.db_password}",
  #     "export DB_HOST=${var.db_host}",
  #     "export PORT=${var.port}",
  #     "sudo chmod +x /home/ubuntu/setup.sh",
  #     "sudo /home/ubuntu/setup.sh localhost"
  #   ]
  # }

  provisioner "shell" {
  execute_command = "bash -c '{{ .Vars }} {{ .Path }}'"  # Explicitly use bash
  inline = [
    "set -eux", # Remove pipefail but keep other useful options
    "export DB_DATABASE=${var.db_database}",
    "export DB_USERNAME=${var.db_username}",
    "export DB_PASSWORD=${var.db_password}",
    "export DB_HOST=${var.db_host}",
    "export PORT=${var.port}",
    "sudo chmod +x /home/ubuntu/setup.sh",
    "sudo /home/ubuntu/setup.sh localhost"
  ]
}

  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y mysql-server",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable mysql",
      "sudo systemctl start mysql"
    ]
  }
}
