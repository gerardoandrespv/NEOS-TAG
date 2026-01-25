# NeosTech RFID System v6.0

Sistema de control de acceso RFID multi-tenant.

## Estructura

/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ web/          # Dashboard (HTML/CSS/JS)
â”‚   â”œâ”€â”€ gateway/      # Gateway C# (.NET 8.0)
â”‚   â””â”€â”€ functions/    # Cloud Functions (Python)
â”œâ”€â”€ config/           # Firebase config
â”œâ”€â”€ docs/             # Documentacion
â”œâ”€â”€ scripts/          # Build y deploy
â””â”€â”€ dist/             # Build outputs

## Comandos

npm run dev       # Desarrollo local
npm run deploy    # Deploy a Firebase
npm run build     # Compilar gateway

## Docs

- [Estructura](docs/ESTRUCTURA.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Entrega](docs/DELIVERY.md)
