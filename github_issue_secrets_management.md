# Security: Implement SOPS-based secrets management

## Problem Statement

Currently, our secrets management has several issues:
- API keys are mixed with configuration in `.env` files
- No encryption at rest for sensitive data
- Difficult to rotate secrets across environments
- No audit trail for secret access
- Confusing separation between secrets and configuration
- Security risk of plain text secrets in files

## Proposed Solution

Implement a phased approach to secrets management:

### Phase 1: SOPS + Age (Immediate Priority)
- Use Mozilla SOPS with Age encryption for file-based secret encryption
- Separate secrets from configuration
- Maintain Git-friendly workflow
- Enable selective encryption (only secrets, not config)

### Phase 2: HashiCorp Vault (Future)
- Migrate to Vault for dynamic secret generation
- Implement automatic rotation
- Add audit logging and fine-grained permissions

## Implementation Plan

### Week 1: Setup and Structure
- [ ] Install SOPS and Age tools
- [ ] Generate Age key pairs for each environment
- [ ] Create `.sops.yaml` configuration
- [ ] Split current `.env.prod` into:
  - `.env.config` (public configuration - committed)
  - `.env.secrets` (sensitive data - encrypted before commit)
  - `.env.local` (local overrides - gitignored)

### Week 2: Development Environment
- [ ] Create scripts for encrypting/decrypting secrets
- [ ] Update development workflow
- [ ] Test integration with existing Docker setup
- [ ] Update documentation

### Week 3: Staging Deployment
- [ ] Deploy new secrets management to staging
- [ ] Validate all services work correctly
- [ ] Test secret rotation procedures
- [ ] Update CI/CD pipelines

### Week 4: Production Deployment
- [ ] Deploy to production environment
- [ ] Migrate existing secrets
- [ ] Validate security improvements
- [ ] Update deployment documentation

## Files to be Created/Modified

### New Files
- `.sops.yaml` - SOPS configuration
- `scripts/secrets-setup.sh` - Initial setup script
- `scripts/load-secrets.sh` - Secret loading script
- `scripts/rotate-secrets.sh` - Secret rotation script
- `.env.config` - Public configuration
- `.env.secrets.enc` - Encrypted secrets file
- `docs/SECRETS_MANAGEMENT_GUIDE.md` - Documentation ✅ (Already created)

### Modified Files
- `.env.prod` → Split into config and secrets
- `docker-compose.prod.yml` - Update to use new secret loading
- GitHub Actions workflows - Update for new secret management
- `.gitignore` - Add patterns for secret files

## Secret Classification

```
PUBLIC     -> .env.config (committed to git)
SENSITIVE  -> .env.secrets.enc (committed encrypted)
LOCAL      -> .env.local (gitignored)
```

## Secrets to be Managed

**API Keys:**
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- GOOGLE_KEY
- ASSISTANTS_API_KEY
- MISTRAL_API_KEY
- OPENROUTER_KEY
- ARCADE_API_KEY
- COMPOSIO_API_KEY

**Security Keys:**
- CREDS_KEY
- CREDS_IV
- JWT_SECRET
- JWT_REFRESH_SECRET
- MEILI_MASTER_KEY

**Database Credentials:**
- MONGO_ROOT_PASSWORD
- DB_PASSWORD

**Test Credentials:**
- GOOGLE_TEST_ACCOUNT_1_EMAIL
- GOOGLE_TEST_ACCOUNT_1_PASSWORD

## Benefits

1. **Security**: Encryption at rest for all sensitive data
2. **Auditability**: Track who accesses what secrets when
3. **Rotation**: Easy secret rotation with automated scripts
4. **Separation**: Clear distinction between config and secrets
5. **Git-friendly**: Encrypted secrets can be safely committed
6. **CI/CD Ready**: Integrates with existing deployment pipelines

## Acceptance Criteria

- [ ] All secrets are encrypted at rest
- [ ] Configuration and secrets are clearly separated
- [ ] Secret rotation can be performed without downtime
- [ ] Development, staging, and production environments all use the new system
- [ ] Documentation is updated and team is trained
- [ ] No plain text secrets exist in the repository
- [ ] Deployment process is automated and secure

## Future Considerations

- Evaluate migration to HashiCorp Vault for dynamic secrets
- Implement automatic secret rotation schedules
- Add monitoring and alerting for secret access
- Consider integration with external secret management services

## Priority

**High** - This addresses security vulnerabilities and operational complexity that affect our entire deployment pipeline.

## Estimated Effort

**2-3 weeks** for full implementation across all environments with proper testing and documentation.

---

**Labels:** `security`, `infrastructure`, `enhancement`
**Assignees:** (assign to appropriate team members)
**Milestone:** (set appropriate milestone)

## Reference Documentation

- Full implementation guide: `docs/SECRETS_MANAGEMENT_GUIDE.md`
- SOPS documentation: https://github.com/mozilla/sops
- Age encryption: https://age-encryption.org/
