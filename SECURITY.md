# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 5.x     | ✅        |
| < 5.0   | ❌        |

## Reporting a Vulnerability

**Do not open a public GitHub Issue for security vulnerabilities.**

Please report security issues via GitHub Security Advisories:
https://github.com/ProfRandom92/comptext-monorepo-X/security/advisories/new

You can expect an initial response within 72 hours.

## Scope

CompText is a research tool and not a certified medical device. It MUST NOT
be used in clinical decision-making without proper validation and regulatory
approval. Security reports are still welcome for:

- PHI scrubbing bypasses (NURSE stage)
- Hash collision / reversibility issues
- Dependency vulnerabilities
- CI/CD secret exposure
