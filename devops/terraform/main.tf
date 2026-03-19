provider "aws" {
  region = var.aws_region
}

data "aws_ami" "ubuntu2" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

data "aws_vpc" "default2" {
  default = true
}

# ========================= SECURITY GROUPS ========================= #

resource "aws_security_group" "app_sg2" {
  name        = "wardrobe2-app-sg${var.resource_name_suffix}"
  description = "SG for NEW wardrobe2 app instance"
  vpc_id      = data.aws_vpc.default2.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "App Port"
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description     = "NRPE from Nagios"
    from_port       = 5666
    to_port         = 5666
    protocol        = "tcp"
    security_groups = [aws_security_group.nagios_sg2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db_sg2" {
  name        = "wardrobe2-db-sg${var.resource_name_suffix}"
  description = "SG for NEW DB instance"
  vpc_id      = data.aws_vpc.default2.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description     = "MongoDB from APP"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg2.id]
  }

  ingress {
    description     = "NRPE from Nagios"
    from_port       = 5666
    to_port         = 5666
    protocol        = "tcp"
    security_groups = [aws_security_group.nagios_sg2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "nagios_sg2" {
  name        = "wardrobe2-nagios-sg${var.resource_name_suffix}"
  description = "SG for NEW Nagios"
  vpc_id      = data.aws_vpc.default2.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Web HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Web HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ========================= EC2 INSTANCES ========================= #

resource "aws_instance" "app2" {
  ami                         = data.aws_ami.ubuntu2.id
  instance_type               = var.instance_type
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.app_sg2.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.app_profile2.name

  user_data = <<-EOF
              #!/bin/bash
              apt update -y
              apt install -y python3 python3-pip ansible git curl
              EOF

  tags = {
    Name        = "DigitalWardrobe2-App"
    Environment = "Production"
  }
}

resource "aws_instance" "db2" {
  ami                         = data.aws_ami.ubuntu2.id
  instance_type               = var.db_instance_type
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.db_sg2.id]
  associate_public_ip_address = true

  tags = {
    Name        = "DigitalWardrobe2-DB"
    Environment = "Production"
  }
}

resource "aws_instance" "nagios2" {
  ami                         = data.aws_ami.ubuntu2.id
  instance_type               = var.nagios_instance_type
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.nagios_sg2.id]
  associate_public_ip_address = true

  tags = {
    Name        = "DigitalWardrobe2-Nagios"
    Environment = "Production"
  }
}

# ========================= S3 BUCKET ========================= #

resource "random_id" "bucket_suffix2" {
  byte_length = 4
}

resource "aws_s3_bucket" "wardrobe2_storage" {
  bucket = "${var.bucket_name_prefix}-v2-${random_id.bucket_suffix2.hex}"

  tags = {
    Name        = "Digital Wardrobe2 Storage"
    Environment = "Production"
  }
}

resource "aws_s3_bucket_versioning" "wardrobe2" {
  bucket = aws_s3_bucket.wardrobe2_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_iam_role" "app_role2" {
  name = "wardrobe2-app-role${var.resource_name_suffix}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "app_s3_policy2" {
  name = "wardrobe2-app-s3-policy${var.resource_name_suffix}"
  role = aws_iam_role.app_role2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.wardrobe2_storage.arn,
        "${aws_s3_bucket.wardrobe2_storage.arn}/*"
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "app_profile2" {
  name = "wardrobe2-app-profile${var.resource_name_suffix}"
  role = aws_iam_role.app_role2.name
}