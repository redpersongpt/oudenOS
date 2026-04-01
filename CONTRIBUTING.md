# Contributing

## Standard

Pull requests should improve one of these:

- build reliability
- reviewability
- Windows safety
- playbook correctness
- rollback confidence

## Before opening a PR

1. Keep scope tight.
2. Avoid unrelated formatting churn.
3. Explain behavior changes, not just file changes.
4. Include verification steps.

## Local checks

```bash
pnpm --dir apps/os-desktop typecheck
cargo check --manifest-path services/os-service/Cargo.toml
```

If you touch playbooks or execution logic, explain the rollback and safety impact in the PR.
