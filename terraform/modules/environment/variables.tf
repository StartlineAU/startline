variable "name" {
  description = "Short environment name (e.g. prod)."
  type        = string
}

variable "project_name" {
  description = "Project prefix shared with the root module."
  type        = string
}

variable "amplify_app_id" {
  description = "ID of the singleton Amplify app."
  type        = string
}

variable "branch_name" {
  description = "Git branch deployed to this environment."
  type        = string
}

variable "amplify_stage" {
  description = "Amplify branch stage (PRODUCTION, DEVELOPMENT, etc.)."
  type        = string
}

variable "auto_build_enabled" {
  description = "Enable Amplify auto-build for this branch."
  type        = bool
}

variable "extra_branch_environment_variables" {
  description = "Extra env vars for the Amplify branch."
  type        = map(string)
  default     = {}
}

variable "site_url" {
  description = "Public base URL for this environment."
  type        = string
}

variable "neon_api_key" {
  description = "Neon API key for branch management."
  type        = string
  sensitive   = true
}

variable "neon_project_id" {
  description = "Neon project ID."
  type        = string
}

variable "bucket_cors_allowed_origins" {
  description = "CORS allowed origins for the uploads bucket."
  type        = list(string)
}

variable "cdn_cert_arn" {
  description = "ACM certificate ARN (us-east-1) for the CDN custom domain."
  type        = string
  default     = null
}
