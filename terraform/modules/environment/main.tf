locals {
  environment_tag = title(var.name)

  neon_main_database_url = "postgresql://neondb_owner:npg_1egrQOaG0TXP@ep-long-boat-a7atl9fx.ap-southeast-2.aws.neon.tech/neondb?sslmode=require"
  neon_auth_base_url     = "https://ep-long-boat-a7atl9fx.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth"
}

resource "random_password" "guest_email_verification" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.project_name}/${var.name}/app"
  recovery_window_in_days = 0

  tags = {
    Environment = local.environment_tag
    Service     = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL                  = local.neon_main_database_url
    NEON_AUTH_BASE_URL            = local.neon_auth_base_url
    NEON_AUTH_COOKIE_SECRET       = var.neon_api_key
    GUEST_EMAIL_VERIFICATION_SECRET = random_password.guest_email_verification.result
    AWS_S3_REGION                 = "ap-southeast-2"
    AWS_S3_BUCKET                 = aws_s3_bucket.uploads.id
    NEXT_PUBLIC_CDN_URL           = "https://cdn.startlineau.com"
    NEXT_PUBLIC_SITE_URL          = var.site_url
    NEXT_PUBLIC_BASE_URL          = var.site_url
    NEXT_PUBLIC_AUTH_BYPASS       = "false"
  })
}

resource "aws_amplify_branch" "this" {
  app_id      = var.amplify_app_id
  branch_name = var.branch_name
  stage       = var.amplify_stage

  enable_auto_build = var.auto_build_enabled

  environment_variables = merge(
    {
      DATABASE_URL = local.neon_main_database_url
    },
    var.extra_branch_environment_variables,
  )

  tags = {
    Environment = var.name == "prod" ? "Prod" : "Stage"
    Service     = var.project_name
  }
}

resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project_name}-${var.name}-uploads"

  force_destroy = var.name != "prod"

  tags = {
    Environment = local.environment_tag
    Service     = var.project_name
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
  rule {
    id     = "expire-old-objects"
    status = "Enabled"
    filter {}
    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "uploads_oac" {
  bucket = aws_s3_bucket.uploads.id
  policy = data.aws_iam_policy_document.uploads_oac.json
}

data "aws_iam_policy_document" "uploads_oac" {
  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.uploads.arn}/uploads/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.cdn.arn]
    }
  }

  statement {
    sid    = "DenyNonSSL"
    effect = "Deny"
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.uploads.arn,
      "${aws_s3_bucket.uploads.arn}/*",
    ]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  dynamic "cors_rule" {
    for_each = var.bucket_cors_allowed_origins
    content {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "PUT", "POST", "DELETE"]
      allowed_origins = [cors_rule.value]
      expose_headers  = ["ETag"]
      max_age_seconds = 3600
    }
  }
}

resource "aws_cloudfront_origin_access_control" "cdn" {
  name                              = "${var.project_name}-${var.name}-cdn-oac"
  description                       = "OAC for ${var.name} upload bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_wafv2_web_acl" "cdn" {
  provider = aws.us_east_1

  name        = "${var.project_name}-${var.name}-cdn-waf"
  description = "Rate-limiting WAF for ${var.name} CDN"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 5000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = false
      metric_name                = "${var.project_name}_${var.name}_cdn_rate_limit"
      sampled_requests_enabled   = false
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = false
    metric_name                = "${var.project_name}_${var.name}_cdn_waf"
    sampled_requests_enabled   = false
  }

  tags = {
    Environment = local.environment_tag
    Service     = var.project_name
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"
  is_ipv6_enabled     = true
  web_acl_id          = aws_wafv2_web_acl.cdn.arn
  comment             = "CDN for ${var.name} upload bucket"
  price_class         = "PriceClass_100"
  aliases             = ["cdn.startlineau.com"]

  origin {
    domain_name              = aws_s3_bucket.uploads.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.cdn.id
    origin_id                = "s3-uploads"
  }

  default_cache_behavior {
    target_origin_id       = "s3-uploads"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 3600
    default_ttl = 86400
    max_ttl     = 604800
  }

  viewer_certificate {
    acm_certificate_arn      = var.cdn_cert_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = local.environment_tag
    Service     = var.project_name
  }
}
