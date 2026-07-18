data "aws_caller_identity" "current" {}

data "aws_secretsmanager_secret" "bootstrap" {
  name = "startline/ci-bootstrap"
}

data "aws_secretsmanager_secret_version" "bootstrap" {
  secret_id = data.aws_secretsmanager_secret.bootstrap.id
}

locals {
  bootstrap = jsondecode(data.aws_secretsmanager_secret_version.bootstrap.secret_string)
}

# IAM role shared by both Amplify branches at build + runtime.
data "aws_iam_policy_document" "amplify_assume" {
  statement {
    effect = "Allow"
    principals {
      type = "Service"
      identifiers = [
        "amplify.amazonaws.com",
        "amplify.${var.aws_region}.amazonaws.com",
      ]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "amplify" {
  name_prefix        = "${var.project_name}-amplify-"
  assume_role_policy = data.aws_iam_policy_document.amplify_assume.json
}

resource "aws_iam_role_policy_attachment" "amplify_admin" {
  role       = aws_iam_role.amplify.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess-Amplify"
}

resource "aws_iam_role_policy" "amplify_secrets" {
  role = aws_iam_role.amplify.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:startline/*/app*"
    }]
  })
}

locals {
  # Use a ternary rather than `&&` — Terraform doesn't short-circuit cleanly
  # when the right operand calls a function that rejects null (trimspace).
  connect_repository = var.amplify_repository_url != null ? trimspace(var.amplify_repository_url) != "" : false

  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - >
              corepack enable && pnpm install --frozen-lockfile
              && SECRET="startline/nonprod/app"
              && [ "$AWS_BRANCH" = "prod" ] && SECRET="startline/prod/app"
              && aws secretsmanager get-secret-value
              --secret-id "$SECRET"
              --query SecretString --output text
              | node -e "const s=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8').trim());for(const[k,v]of Object.entries(s))console.log(k+'='+v)" >> .env.production
              && ( [ -n "$AWS_PULL_REQUEST_ID" ] && echo "NEXT_PUBLIC_AUTH_BYPASS=true" >> .env.production ; true )
              && ( [ -z "$AWS_PULL_REQUEST_ID" ] && ( npx prisma migrate deploy || npx prisma migrate reset --force ) ; true )
        build:
          commands:
            - pnpm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT

  # Per-environment knobs. Most values default from root variables; this map
  # captures only the things that diverge between prod and nonprod.
  environments = {
    prod = {
      create_amplify_branch        = true
      branch_name                  = "prod"
      amplify_stage                = "PRODUCTION"
      auto_build_enabled           = false
      vpc_cidr                     = "10.20.0.0/16"
      database_name                = "${var.project_name}_prod"
      database_skip_final_snapshot = false
      database_deletion_protection = true
      cognito_deletion_protection  = true
      bucket_cors_allowed_origins  = ["https://startlineau.com", "https://organiser.startlineau.com"]
      site_url                     = "https://startlineau.com"
    }
    nonprod = {
      create_amplify_branch        = false
      branch_name                  = "nonprod"
      amplify_stage                = "DEVELOPMENT"
      auto_build_enabled           = false
      vpc_cidr                     = "10.21.0.0/16"
      database_name                = "${var.project_name}_nonprod"
      database_skip_final_snapshot = true
      database_deletion_protection = false
      cognito_deletion_protection  = false
      bucket_cors_allowed_origins  = ["*"]
      site_url                     = "https://nonprod.startlineau.com"
    }
  }
}

# Singleton Amplify app. Branch (prod) attaches via the env module.
resource "aws_amplify_app" "this" {
  name       = var.project_name
  platform   = "WEB_COMPUTE"
  build_spec = local.build_spec

  iam_service_role_arn = aws_iam_role.amplify.arn
  compute_role_arn     = aws_iam_role.amplify.arn

  repository   = local.connect_repository ? var.amplify_repository_url : null
  access_token = local.connect_repository ? local.bootstrap.amplify_repository_access_token : null

  # App-level env vars apply to both the prod branch and PR previews. Secrets
  # are fetched from Secrets Manager at build time via the build spec.
  # Branch-level env vars (DATABASE_URL, bucket names) are set by the env module.
  environment_variables = var.amplify_environment_variables

  enable_auto_branch_creation = true

  auto_branch_creation_patterns = ["main"]

  auto_branch_creation_config {
    enable_pull_request_preview = true
    enable_auto_build           = false
    stage                       = "DEVELOPMENT"
  }

  lifecycle {
    precondition {
      condition = !local.connect_repository || (
        try(local.bootstrap.amplify_repository_access_token, null) != null &&
        try(local.bootstrap.amplify_repository_access_token, "") != ""
      )
      error_message = "amplify_repository_access_token must be set in startline/ci-bootstrap secret."
    }
  }
}

module "env" {
  for_each = local.environments
  source   = "./modules/environment"

  name           = each.key
  project_name   = var.project_name
  amplify_app_id = aws_amplify_app.this.id

  create_amplify_branch = each.value.create_amplify_branch
  branch_name           = each.value.branch_name
  amplify_stage         = each.value.amplify_stage
  auto_build_enabled    = each.value.auto_build_enabled

  vpc_cidr      = each.value.vpc_cidr
  database_name = each.value.database_name

  database_engine_version               = var.database_engine_version
  database_instance_class               = var.database_instance_class
  database_allocated_storage            = var.database_allocated_storage
  database_max_allocated_storage        = var.database_max_allocated_storage
  database_username                     = var.database_username
  database_publicly_accessible          = var.database_publicly_accessible
  database_allowed_cidr_blocks          = var.database_allowed_cidr_blocks
  database_skip_final_snapshot          = each.value.database_skip_final_snapshot
  database_backup_retention_period      = var.database_backup_retention_period
  database_deletion_protection          = each.value.database_deletion_protection
  database_performance_insights_enabled = var.database_performance_insights_enabled
  database_secret_recovery_window_days  = var.database_secret_recovery_window_days

  cognito_deletion_protection = each.value.cognito_deletion_protection

  resend_api_key = local.bootstrap.resend_api_key
  site_url       = each.value.site_url

  bucket_cors_allowed_origins = each.value.bucket_cors_allowed_origins

  cdn_custom_domain = each.key == "prod" ? "cdn.startlineau.com" : null
  cdn_cert_arn      = each.key == "prod" ? aws_acm_certificate.cdn.arn : null
}

# Custom apex domain attaches only to the prod branch. Route 53 records that
# resolve the apex via ALIAS to the Amplify CloudFront distribution live in
# dns.tf and reference this association.
resource "aws_amplify_domain_association" "this" {
  count       = var.amplify_custom_domain != null ? 1 : 0
  app_id      = aws_amplify_app.this.id
  domain_name = var.amplify_custom_domain

  # Default behavior blocks until ACM/Amplify reports AVAILABLE, which can only
  # happen after the DNS records below are propagated at the registrar. Skip
  # the wait so apply returns the records to add.
  wait_for_verification = false

  sub_domain {
    branch_name = module.env["prod"].branch_name
    prefix      = ""
  }

  sub_domain {
    branch_name = module.env["prod"].branch_name
    prefix      = "www"
  }

  sub_domain {
    branch_name = module.env["prod"].branch_name
    prefix      = "organiser"
  }
}
