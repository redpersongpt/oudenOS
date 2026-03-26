# redcoreECO

Premium Windows optimization ecosystem.

## Products

| Product | Path | Description |
|---------|------|-------------|
| **redcore · Web** | `apps/redcore-web` | Next.js website — deployed on Render |
| **redcore · Tuning** | `apps/redcore-tuning` | Electron desktop optimizer (React + Rust service) |
| **redcore · OS** | `apps/redcore-os` | Installer-style Windows transformation wizard (Electron + Rust + playbooks) |

## Deployment

**Website (Render):**
- Repo: `redcoreECO`
- Branch: `main`
- Root directory: `apps/redcore-web`
- Build: `pnpm install && pnpm build`
- Start: `pnpm start`

Or use the `render.yaml` blueprint for automated setup.

## Development

```bash
pnpm install              # Install all workspace deps
pnpm dev:web              # Start website dev server
pnpm dev:tuning           # Start Tuning desktop dev
pnpm dev:os               # Start OS desktop dev
pnpm typecheck            # Typecheck all packages
```

## Structure

```
redcoreECO/
├── apps/
│   ├── redcore-web/        # Next.js website (Render deployment)
│   ├── redcore-tuning/     # Electron + React + Rust optimizer
│   │   ├── apps/desktop/   # Electron app
│   │   ├── apps/cloud-api/ # Fastify API
│   │   └── packages/       # Shared schema, design system
│   └── redcore-os/         # Installer-style transformation wizard
│       ├── apps/desktop/   # Electron app (820x580 installer)
│       ├── apps/service-core/ # Rust service
│       └── playbooks/      # YAML playbook modules
├── render.yaml             # Render deployment blueprint
├── pnpm-workspace.yaml     # Workspace config
└── package.json            # Root scripts
```
