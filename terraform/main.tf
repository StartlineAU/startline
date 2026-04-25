data "aws_caller_identity" "current" {}

# Amplify Hosting needs the AWSServiceRoleForAmplify service-linked role to
# orchestrate builds. AWS does not expose a SLR template for amplify, so it
# can't be created with `aws_iam_service_linked_role` either — it's
# auto-created by AWS the first time you visit the Amplify console / start a
# build via the console. On a Terraform-only fresh account this leaves builds
# failing with "Unable to assume specified IAM Role" until that one console
# trip. After that, every subsequent terraform-triggered build works.
#
# The AdministratorAccess-Amplify managed policy (originally attached here)
# is for the Amplify CLI deploying Gen 1 backends, NOT the Hosting service
# role, so we don't reintroduce it here.

locals {
  # coalesce(null, "") errors (empty strings are skipped); test explicitly instead.
  connect_repository = var.amplify_repository_url != null && trimspace(var.amplify_repository_url) != ""

  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT
}

resource "aws_amplify_app" "this" {
  name       = var.project_name
  platform   = "WEB_COMPUTE"
  build_spec = local.build_spec

  repository   = local.connect_repository ? var.amplify_repository_url : null
  access_token = local.connect_repository ? var.amplify_repository_access_token : null

  environment_variables = merge(
    {
      DATABASE_URL = local.database_url
    },
    var.resend_api_key != null ? { RESEND_API_KEY = var.resend_api_key } : {},
    var.amplify_environment_variables,
  )

  lifecycle {
    precondition {
      condition = !local.connect_repository || (
        var.amplify_repository_access_token != null &&
        var.amplify_repository_access_token != ""
      )
      error_message = "amplify_repository_access_token must be set when amplify_repository_url is set."
    }
  }
}

resource "aws_amplify_branch" "production" {
  app_id      = aws_amplify_app.this.id
  branch_name = var.production_branch
  stage       = "PRODUCTION"

  enable_auto_build = local.connect_repository
}

resource "aws_amplify_domain_association" "this" {
  count       = var.amplify_custom_domain != null ? 1 : 0
  app_id      = aws_amplify_app.this.id
  domain_name = var.amplify_custom_domain

  # Default behavior blocks until ACM/Amplify reports AVAILABLE, which can only
  # happen after the DNS records below are propagated at the registrar. Skip
  # the wait so apply returns the records to add at GoDaddy.
  wait_for_verification = false

  # Apex (startlineau.com) and www both routed to the production branch.
  sub_domain {
    branch_name = aws_amplify_branch.production.branch_name
    prefix      = ""
  }

  sub_domain {
    branch_name = aws_amplify_branch.production.branch_name
    prefix      = "www"
  }
}
