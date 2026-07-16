provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  # Per-environment resources also set Environment={prod|nonprod} via the env
  # module's resource-level tags, which override this default.
  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}

# CloudFront requires ACM certificates in us-east-1 (global).
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = var.aws_profile

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}

provider "cloudflare" {
  api_token = local.bootstrap.cloudflare_api_token
}
