output "branch_name" {
  description = "Amplify branch name."
  value       = aws_amplify_branch.this.branch_name
}

output "app_secret_arn" {
  description = "Secrets Manager secret containing all app env vars."
  value       = aws_secretsmanager_secret.app.arn
}

output "cdn_distribution_domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "uploads_bucket_id" {
  description = "S3 bucket name for uploads."
  value       = aws_s3_bucket.uploads.id
}

output "uploads_bucket_arn" {
  description = "S3 bucket ARN for uploads."
  value       = aws_s3_bucket.uploads.arn
}

output "uploads_bucket_regional_domain_name" {
  description = "S3 bucket regional domain name."
  value       = aws_s3_bucket.uploads.bucket_regional_domain_name
}
