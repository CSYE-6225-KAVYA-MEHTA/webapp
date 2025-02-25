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
  default = "sg-028dcf8c0865becc6"
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
  type = string

  default = env("DB_USERNAME")
}

variable "db_password" {
  type    = string
  default = env("DB_PASSWORD")
}

variable "db_database" {
  type = string

  default = env("DB_DATABASE")
}

variable "db_host" {
  type    = string
  default = "localhost"
}

variable "port" {
  type    = string
  default = "8080"
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
      "DB_HOST=${var.db_host}",
      "PORT=${var.port}",
      "EOF"
    ]
  }

  provisioner "shell"{
    script="shell.sh"
  }



}
