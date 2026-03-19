output "app_instance_public_ip" {
  description = "Public IP of the application EC2 instance"
  value       = aws_instance.app2.public_ip
}

output "app_instance_private_ip" {
  description = "Private IP of the application EC2 instance"
  value       = aws_instance.app2.private_ip
}

output "app_instance_id" {
  description = "Instance ID of the application server"
  value       = aws_instance.app2.id
}

output "db_instance_public_ip" {
  description = "Public IP of the database EC2 instance"
  value       = aws_instance.db2.public_ip
}

output "db_instance_private_ip" {
  description = "Private IP of the database EC2 instance"
  value       = aws_instance.db2.private_ip
}

output "db_instance_id" {
  description = "Instance ID of the database server"
  value       = aws_instance.db2.id
}

output "nagios_instance_public_ip" {
  description = "Public IP of the Nagios monitoring server"
  value       = aws_instance.nagios2.public_ip
}

output "nagios_instance_private_ip" {
  description = "Private IP of the Nagios monitoring server"
  value       = aws_instance.nagios2.private_ip
}

output "nagios_instance_id" {
  description = "Instance ID of the Nagios server"
  value       = aws_instance.nagios2.id
}

output "nagios_web_url" {
  description = "URL to access Nagios web interface"
  value       = "http://${aws_instance.nagios2.public_ip}/nagios"
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for file storage"
  value       = aws_s3_bucket.wardrobe2_storage.id
}

output "mongodb_connection_string" {
  description = "MongoDB connection string for application"
  value       = "mongodb://${aws_instance.db2.private_ip}:27017/Digital_Wardrobe2"
  sensitive   = false
}