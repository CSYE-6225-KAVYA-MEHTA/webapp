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
  default = "CSYE6225"
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}

variable "access_key" {
  type    = string
  default = env("AWS_ACCESS_KEY_ID")
  sensitive = true
}

variable "secret_key" {
  type    = string
  default = env("AWS_SECRET_ACCESS_KEY")
  sensitive = true
}

variable "source_ami" {
  type    = string
}

variable "security_group_id"{
  type=string
  default="sg-02578332a57774942"
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
}

variable "demo_user" {
  type    = string
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
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_database" {
  type      = string
  sensitive = true
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
  ami_name          = "${var.ami_name}-${local.timestamp}"
  ami_description   = "AMI for CSYE6225 A04"
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
    source      = "/scripts/setup.sh"
    destination = "/home/ubuntu/setup.sh"
  }

    provisioner "shell" {
    inline = [
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
      "sudo systemctl enable mysql",
      "sudo systemctl start mysql"
    ]
  }
}
