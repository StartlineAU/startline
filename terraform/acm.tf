# ACM certificate for the CDN custom domain (cdn.startlineau.com).
# Must be in us-east-1 for CloudFront. DNS-validated via Cloudflare records.

resource "aws_acm_certificate" "cdn" {
  provider          = aws.us_east_1
  domain_name       = "cdn.startlineau.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "cloudflare_record" "cdn_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cdn.domain_validation_options : dvo.domain_name => {
      name   = trimsuffix(dvo.resource_record_name, ".startlineau.com.")
      type   = dvo.resource_record_type
      record = trimsuffix(dvo.resource_record_value, ".")
    }
  }

  zone_id = cloudflare_zone.primary.id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  content = each.value.record
}

resource "aws_acm_certificate_validation" "cdn" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cdn.arn
  validation_record_fqdns = [for record in cloudflare_record.cdn_cert_validation : record.hostname]
}
