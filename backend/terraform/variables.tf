variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for resource deployment"
}

variable "instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 instance type for application server"
}

variable "key_name" {
  type        = string
  description = "AWS EC2 keypair name for SSH access"
  default     = "JathinDev"
}

variable "app_port" {
  type        = number
  default     = 3000
  description = "Port number for the application"
}

variable "db_instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 instance type for database server"
}

variable "nagios_instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 instance type for Nagios monitoring server"
}

variable "bucket_name_prefix" {
  type        = string
  default     = "digital-wardrobe2-storage"
  description = "Prefix for S3 bucket name"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Environment name (production, staging, development)"
}

variable "resource_name_suffix" {
  type        = string
  default     = "-v2"
  description = "Suffix to avoid resource name conflicts"
}