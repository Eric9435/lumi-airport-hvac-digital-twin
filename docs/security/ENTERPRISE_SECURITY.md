# Enterprise Security Architecture

## Scope

The security layer provides:

- Signed HTTP-only session cookies
- Role-based access control
- Permission-based API authorization
- Password hashing with bcrypt
- Login rate limiting
- Failed-login tracking
- Account lockout
- Security audit logging
- Protected administration APIs
- Runtime system metrics

## Default development account

The development environment uses:

```text
Email: owner@lumi.local
Password: ChangeMeNow!2026

The credentials must be replaced before deployment.

Required production environment variables
SESSION_SECRET
INITIAL_ADMIN_EMAIL
INITIAL_ADMIN_PASSWORD

SESSION_SECRET must contain at least 32 characters.

Roles
Owner
Administrator
Engineer
Operator
Maintenance
Auditor
Viewer
Important limitation

The current user and audit repositories are memory-based. They are appropriate
for virtual demonstration and development only.

Production deployment should replace them with PostgreSQL, another durable
database, or a validated Google Sheets persistence layer.
```
