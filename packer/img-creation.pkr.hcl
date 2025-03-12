packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0, < 2.0.0"
      source  = "github.com/hashicorp/amazon"
    }
    googlecompute = {

      version = ">= 1.0.0, <2.0.0"
      source  = "github.com/hashicorp/googlecompute"
    }
  }
}

# AWS Region
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "subnet_id" {
  type    = string
  default = "subnet-08d27cf78fa1b9164"
}

variable "security_group_id" {
  type    = string
  default = "sg-028dcf8c0865becc6"
}

variable "demo_user" {
  description = "demo user ID"
  type        = string
  default     = "699475940666"
}

#ID FOR DEV USER
variable "dev_user" {
  description = "dev user ID"
  type        = string
  default     = "248189920505"
}

# Ubuntu 24.04 LTS AMI ID
variable "source_ami" {
  type    = string
  default = "ami-04b4f1a9cf54c11d0"
}

# SSH username for the EC2 instance
# variable "ssh_username" {
#   type    = string
#   default = "ubuntu"
# }


# Instance Type
variable "instance_type" {
  type    = string
  default = "t2.micro"
}

# Volume Size
variable "volume_size" {
  type    = number
  default = 25
}

variable "db_username" {
  type      = string
  sensitive = true
  default   = "user"
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = "password"
}

variable "db_database" {
  type      = string
  sensitive = true
  default   = "database"
}


variable "server_port" {
  type      = string
  sensitive = true
  default   = "8080"
}

variable "db_host" {
  type      = string
  sensitive = true
  default   = "localhost"
}


variable "gcp_zone" {
  type    = string
  default = "us-central1-a"
}

variable "ami_name_gcp" {
  default = "webami"
}

variable "gcp_project_id" {
  type    = string
  default = "webapp-452003"
}



locals {
  ami_description = "Image for webapp"
  timestamp       = regex_replace(timestamp(), "[- TZ:]", "")
}
#

source "amazon-ebs" "my-ami" {
  region            = var.aws_region
  ami_name          = "csye6225_${formatdate("YYYY_MM_DD_hh_mm_ss", timestamp())}"
  ami_description   = "AMI for A04"
  ami_regions       = [var.aws_region]
  ami_users         = [var.demo_user]
  subnet_id         = var.subnet_id
  security_group_id = var.security_group_id

  instance_type = var.instance_type
  source_ami    = var.source_ami
  ssh_interface = "public_ip" # Ensures SSH via public IP
  ssh_username  = var.ssh_username



  # EBS volume settings
  launch_block_device_mappings {
    delete_on_termination = true
    device_name           = "/dev/sda1"
    volume_size           = 25
    volume_type           = "gp2"
  }
}



source "googlecompute" "gcp_image" {
  project_id          = var.gcp_project_id
  source_image_family = "ubuntu-2004-lts"
  image_name          = "webami-gcp-${local.timestamp}"
  machine_type        = "e2-medium"
  zone                = var.gcp_zone
  ssh_username        = "ubuntu"
}

build {
  sources = [
    "source.amazon-ebs.my-ami", "source.googlecompute.gcp_image"
  ]

  provisioner "file" {
    source      = "webapp.zip"
    destination = "/tmp/webapp.zip"
  }

  provisioner "shell" {
    script = "scripts/setup.sh"
    environment_vars = [
      "DB_USERNAME=${var.db_username}",
      "DB_PASSWORD=${var.db_password}",
      "DB_DATABASE=${var.db_database}",
      "SERVER_PORT=${var.server_port}",
      "DB_HOST=${var.db_host}"
    ]
  }

}
