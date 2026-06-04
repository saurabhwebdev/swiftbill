# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability in SwiftBill, please report it responsibly.

### How to Report

1. **Do NOT open a public issue** for security vulnerabilities
2. Email us at **security@unisonapps.com** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment** within 48 hours
- **Assessment** within 7 days
- **Fix timeline** communicated within 14 days
- **Credit** given in release notes (unless you prefer anonymity)

### Scope

The following are in scope:
- Authentication and authorization bypasses
- SQL injection, XSS, CSRF
- Data exposure or leakage
- Payment processing vulnerabilities
- Privilege escalation

### Out of Scope

- Denial of service attacks
- Social engineering
- Issues in third-party dependencies (report upstream)
- Issues requiring physical access to the server

## Security Best Practices for Deployment

1. Change the default `SECRET_KEY` in `settings.py`
2. Set `DEBUG = False` in production
3. Use HTTPS (Caddy handles this automatically)
4. Keep `ALLOWED_HOSTS` restricted
5. Use strong database passwords
6. Rotate JWT tokens regularly
7. Keep dependencies updated
