# md2term-webserv

English | [简体中文](./README.md)

An HTTP server that renders Markdown as terminal-friendly text with syntax highlighting, table rendering, streaming output, and multiple theme support.

## Features

- **Terminal Rendering** - Converts Markdown to ANSI-colored terminal output
- **Syntax Highlighting** - Uses Shiki (VS Code's TextMate grammar engine) for code highlighting
- **Table Support** - Renders beautiful terminal tables with Unicode borders, auto-fit to terminal width
- **Streaming Output** - Character-by-character streaming with typewriter effect
- **Multiple Themes** - 8 built-in syntax highlighting themes
- **Simple to Use** - Direct access via HTTP API, no client required

## Quick Start

### Install Dependencies

```bash
npm install
```

### Start Server

```bash
npm start
```

The server runs on port 3000 by default (configurable via `PORT` environment variable).

### Quick Test

```bash
# Render default file
curl http://localhost:3000/render

# Streaming output
curl -N http://localhost:3000/stream

# Specify theme
curl http://localhost:3000/render/demo?theme=nord
```

## API Documentation

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | HTML documentation page |
| `/themes` | GET | Get supported themes (JSON) |
| `/files` | GET | Get available Markdown files (JSON) |
| `/render` | GET | Render demo.md (non-streaming) |
| `/render/:filename` | GET | Render specified file (non-streaming) |
| `/stream` | GET | Stream demo.md character by character |
| `/stream/:filename` | GET | Stream specified file character by character |

### Query Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `theme` | Syntax highlighting theme | vitesse-dark |
| `delay` | Character delay for streaming (ms) | 30 |
| `autofit` | Auto-fit table columns to terminal width | true |
| `minWidth` | Minimum table column width (characters) | 10 |
| `maxWidth` | Maximum table column width (characters) | 50 |

### Usage Examples

```bash
# Get supported themes
curl http://localhost:3000/themes

# Get available files
curl http://localhost:3000/files

# Render specific file
curl http://localhost:3000/render/test

# Render with Tokyo Night theme
curl http://localhost:3000/render/test?theme=tokyo-night

# Stream with 50ms character delay
curl -N http://localhost:3000/stream/test?delay=50

# Stream with Dracula theme
curl -N http://localhost:3000/stream/test?theme=dracula

# Table auto-fit (default)
curl http://localhost:3000/render/table-demo

# Disable table auto-fit
curl http://localhost:3000/render/table-demo?autofit=false

# Custom table column width range
curl http://localhost:3000/render/table-demo?minWidth=15&maxWidth=30

# Fixed table column width
curl http://localhost:3000/render/table-demo?autofit=false&minWidth=15&maxWidth=15
```

## Supported Themes

8 syntax highlighting themes are available:

- `vitesse-dark` (default)
- `nord`
- `github-dark`
- `one-dark-pro`
- `tokyo-night`
- `dracula`
- `material-theme`
- `catppuccin-mocha`

## Supported Markdown Syntax

- Headings (H1-H6)
- Paragraphs
- Ordered/Unordered lists
- Code blocks (with syntax highlighting)
- Inline code
- Tables (Unicode borders)
- Links
- Images (displayed as `[Image: alt]`)
- Blockquotes
- Horizontal rules
- Bold, italic, strikethrough

## Project Structure

```
md2term-webserv/
├── server.js          # Main server file
├── package.json       # Dependencies
├── AGENTS.md          # Development guide
├── README.md          # Chinese documentation
├── README_EN.md       # English documentation
└── content/           # Markdown content directory
    ├── demo.md        # Default demo file
    └── *.md           # Other Markdown files
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DEFAULT_THEME` | Default syntax highlighting theme | vitesse-dark |
| `DEBUG` | Enable debug logging (1/true) | - |

## Dependencies

- **express** - Web framework
- **marked** - Markdown parser
- **shiki** - VS Code's syntax highlighting engine
- **table** - Terminal table rendering
- **chalk** - Terminal colored output

## Troubleshooting

### Port Already in Use

```bash
lsof -i :3000
kill -9 <PID>
```

### Code Highlighting Not Working

1. Ensure language name is correct (e.g., `javascript`, `python`)
2. Ensure terminal supports TrueColor (24-bit color)
3. Check if `chalk.level = 3` is set

### Table Display Issues

1. Ensure Markdown tables are properly formatted with headers and separator rows
2. If table width exceeds terminal, use `autofit=true` (default) for auto-adjustment
3. Adjust `minWidth` and `maxWidth` parameters to control column width range
4. Example: `curl http://localhost:3000/render/table-demo?minWidth=15&maxWidth=30`

## Development

For detailed development guidelines, see [AGENTS.md](./AGENTS.md).

## License

MIT
