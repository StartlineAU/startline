output "amplify_app_id" {
  description = "Amplify application ID."
  value       = aws_amplify_app.this.id
}

output "amplify_app_arn" {
  description = "Amplify application ARN."
  value       = aws_amplify_app.this.arn
}

output "amplify_default_domain" {
  description = "Default amplifyapp.com hostname for the app."
  value       = aws_amplify_app.this.default_domain
}

output "amplify_production_branch" {
  description = "Production branch name in Amplify."
  value       = module.env["prod"].branch_name
}

output "aws_account_id" {
  description = "AWS account ID resources were created in."
  value       = data.aws_caller_identity.current.account_id
}

output "app_secret_arn" {
  description = "Secrets Manager secret ARN for app env vars."
  value       = module.env["prod"].app_secret_arn
}

output "amplify_domain_dns_records" {
  description = "DNS records for the apex domain."
  value = var.amplify_custom_domain == null ? [] : concat(
    [
      for s in aws_amplify_domain_association.this[0].sub_domain : {
        type   = "CNAME"
        name   = s.prefix == "" ? var.amplify_custom_domain : "${s.prefix}.${var.amplify_custom_domain}"
        value  = s.dns_record
        verify = false
      }
    ],
    [{
      type   = "CNAME"
      name   = "_certificate_validation"
      value  = aws_amplify_domain_association.this[0].certificate_verification_dns_record
      verify = true
    }],
  )
}

output "github_actions_role_arn" {
  description = "Set as GitHub repo variable AWS_ROLE_ARN."
  value       = aws_iam_role.terraform_ci.arn
}

output "github_actions_readonly_role_arn" {
  description = "Set as GitHub repo variable AWS_ROLE_ARN_READONLY for PR workflows."
  value       = aws_iam_role.terraform_ci_readonly.arn
}

output "startline_dev_access_key_id" {
  description = "Access key ID for the startline-dev IAM user."
  value       = aws_iam_access_key.startline_dev.id
}

output "startline_dev_secret_access_key" {
  description = "Secret access key for the startline-dev IAM user."
  value       = aws_iam_access_key.startline_dev.secret
  sensitive   = true
}
