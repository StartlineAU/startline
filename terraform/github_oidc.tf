# OIDC trust between GitHub Actions and AWS, so workflows can assume an IAM
# role via short-lived tokens — no long-lived AWS keys in GitHub secrets.

variable "github_repository" {
  description = "GitHub repository for terraform CI in 'org/repo' form."
  type        = string
  default     = "StartlineAU/startline"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "terraform_ci_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Admin role is only assumable from protected branches (push/tag events).
    # PRs use the separate read-only role below.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repository}:refs/heads/main",
        "repo:${var.github_repository}:refs/heads/non-production",
        "repo:${var.github_repository}:refs/heads/production",
      ]
    }
  }
}

resource "aws_iam_role" "terraform_ci" {
  name               = "${var.project_name}-terraform-ci"
  assume_role_policy = data.aws_iam_policy_document.terraform_ci_assume.json
}

resource "aws_iam_role_policy_attachment" "terraform_ci_admin" {
  role       = aws_iam_role.terraform_ci.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# ponytail: read-only role for PR workflows — terraform plan and CI checks.
# Broad read coverage mirrors the MCP policy; Cognito admin is needed for e2e seeding.
# Separate CI-specific role if Cognito scope is uncomfortable.

data "aws_iam_policy_document" "terraform_ci_readonly_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Read-only role is safe from any branch — the IAM policy restricts its scope.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:*"]
    }
  }
}

resource "aws_iam_role" "terraform_ci_readonly" {
  name               = "${var.project_name}-terraform-ci-readonly"
  assume_role_policy = data.aws_iam_policy_document.terraform_ci_readonly_assume.json
}

resource "aws_iam_policy" "terraform_ci_readonly" {
  name        = "StartlineCIReadOnly"
  description = "Read-only + Cognito admin for CI/plan workflows"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadAllServices"
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "s3:Get*",
          "s3:List*",
          "rds:Describe*",
          "iam:Get*",
          "iam:List*",
          "cognito-idp:Describe*",
          "cognito-idp:List*",
          "amplify:Get*",
          "amplify:List*",
          "route53:Get*",
          "route53:List*",
          "cloudwatch:Describe*",
          "cloudwatch:Get*",
          "cloudwatch:List*",
          "logs:Describe*",
          "logs:Get*",
          "logs:List*",
          "acm:Describe*",
          "acm:List*",
          "kms:Describe*",
          "kms:List*",
          "ecr:Describe*",
          "ecr:List*",
          "elasticache:Describe*",
          "elasticache:List*",
        ]
        Resource = "*"
      },
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:startline/ci-bootstrap*",
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:startline/nonprod/*",
        ]
      },
      {
        Sid    = "CognitoSeed"
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:ListUsers",
        ]
        Resource = module.env["nonprod"].cognito_user_pool_arn
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "terraform_ci_readonly" {
  role       = aws_iam_role.terraform_ci_readonly.name
  policy_arn = aws_iam_policy.terraform_ci_readonly.arn
}
