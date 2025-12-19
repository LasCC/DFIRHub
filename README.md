# DFIRHub

A modern web application for searching and exploring Windows forensic artifacts, KAPE targets, and collection paths.

![DFIRHub Screenshot](public/og-image.png)

## Features

- **Search Artifacts** - Comprehensive database of Windows forensic artifacts
- **KAPE Integration** - Direct integration with KapeFiles targets and modules
- **Collection Commands** - Generate PowerShell, Batch, and WSL scripts for artifact collection
- **Investigation Scenarios** - Pre-built scenarios for common DFIR investigations
- **Script Builder** - Build custom collection scripts with multiple artifacts
- **Keyboard Navigation** - Full keyboard shortcut support for power users

## Tech Stack

- **Framework**: [Astro](https://astro.build) with React
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Search**: [Pagefind](https://pagefind.app)
- **Deployment**: [Netlify](https://netlify.com)
- **Data Source**: [KapeFiles](https://github.com/EricZimmerman/KapeFiles)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 22+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/LasCC/DFIRHub.git
cd DFIRHub

# Initialize submodules (KapeFiles data)
git submodule update --init --recursive

# Install dependencies
bun install

# Start development server
bun dev
```

The site will be available at `http://localhost:4321`

### Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun build` | Build for production |
| `bun preview` | Preview production build |

## Project Structure

```
dfirhub/
├── public/              # Static assets
├── src/
│   ├── components/      # React/Astro components
│   ├── content/         # KapeFiles submodule
│   ├── data/            # Static data files
│   ├── layouts/         # Page layouts
│   ├── lib/             # Utilities and helpers
│   ├── pages/           # File-based routing
│   └── styles/          # Global styles
└── package.json
```

## Data Source

DFIRHub uses data from [Eric Zimmerman's KapeFiles](https://github.com/EricZimmerman/KapeFiles) repository, which contains community-contributed KAPE targets and modules for forensic artifact collection.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Cmd+K` | Open search |
| `g h` | Go to home |
| `g a` | Go to artefacts |
| `g c` | Go to collections |
| `g b` | Go to builder |
| `?` | Show all shortcuts |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [Eric Zimmerman](https://github.com/EricZimmerman) for KapeFiles and KAPE
- The DFIR community for artifact documentation
- All contributors to this project

---

Built with passion for the DFIR community
