# Security

## Reporting a vulnerability

Please report security issues privately to **security@ouden.cc** (or open a
GitHub security advisory). Do not open a public issue for vulnerabilities.

## Secrets policy — never commit secrets

This is a **public** repository. Never commit real credentials of any kind:

- `.env`, `.env.local`, `.env.production`, `.env.development` — **ignored by git**.
  Commit only `.env.example` with safe placeholder values.
- Database URLs/passwords, JWT/Auth/NextAuth secrets, OAuth client secrets,
  Stripe keys, API keys, SMTP creds, storage (S3/R2) keys, Tauri signing keys.
- Private keys / certificates (`*.pem`, `*.key`, `*.p12`, `*.pfx`, SSH keys) —
  **ignored by git**.
- Local databases (`*.db`, `*.sqlite`), logs, dumps, and backups — **ignored by git**.
- Real user/customer/developer records in seeds, tests, or fixtures. Use clearly
  synthetic data only.

Read configuration from the environment. Example DB URLs must be obviously fake,
e.g. `postgresql://user:password@localhost:5432/oudenos_dev` or `file:./dev.db`.

## Local secret scanning

A [gitleaks](https://github.com/gitleaks/gitleaks) config (`gitleaks.toml`) and a
CI workflow (`.github/workflows/secret-scan.yml`) guard against accidental leaks.

```bash
# install gitleaks (macOS: brew install gitleaks), then:
pnpm secrets:scan          # scan full git history (redacted)
```

Optionally add a pre-commit guard:

```bash
gitleaks protect --staged --redact --config gitleaks.toml
```

## If you leak a secret

Removing the file in a new commit is **not enough** — it remains in git history
and on any clone/fork/cache.

1. **Rotate the secret immediately at the provider** (change DB passwords, revoke
   API keys, rotate JWT/OAuth/webhook secrets). Rotation is the only true fix —
   assume anything pushed to a public repo is already compromised.
2. Purge it from history (`git filter-repo` or BFG), then force-push.
3. Note that GitHub forks and caches may still hold the old commits; contact
   GitHub Support to purge cached views if needed.
