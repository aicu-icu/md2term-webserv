# AGENTS.md - Development Guide for md2term-webserv

## Project Overview

A Node.js/Express server that renders Markdown content as terminal-friendly text with syntax highlighting and table rendering. Uses Shiki (VS Code's TextMate grammar engine) for code highlighting and the `table` library for beautiful terminal tables.

## Build & Run Commands

### Start the server
```bash
npm start
# or
node server.js
```

The server runs on port 3000 by default (configurable via PORT environment variable).

### Install dependencies
```bash
npm install
```

### Testing
No test framework is currently configured. If tests are added:
```bash
# Run all tests
npm test

# Run a single test file
npx jest testfilename.test.js
# or
npx mocha testfilename.test.js
```

### Linting
No linter is currently configured. If ESLint is added:
```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

## Code Style Guidelines

### Language
- JavaScript (CommonJS module system using `require`)
- No TypeScript currently

### Formatting
- 2 spaces for indentation
- Use semicolons at the end of statements
- Use single quotes for strings unless double quotes are needed

### Naming Conventions
- **Variables/Functions**: camelCase (e.g., `streamMarkdown`, `renderToTerminal`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `CONTENT_DIR`, `PORT`, `SUPPORTED_THEMES`)
- **Files**: kebab-case (e.g., `server.js`, `demo.md`)

### Imports
Use CommonJS `require()` syntax, grouped by type:
```javascript
// Built-in Node modules first
const express = require('express');
const fs = require('fs');
const path = require('path');

// Then npm packages
const { marked } = require('marked');
const chalk = require('chalk');
const shiki = require('shiki');
const { table } = require('table');
```

### Error Handling
- Use synchronous file operations with `fs.existsSync()` checks before access
- Return appropriate error messages to clients via response
- Log errors to console using `console.error()` for debugging
- Gracefully fall back on errors (e.g., return plain text if highlighting fails)
- Use try/catch blocks for error-prone operations

### Async/Await
- Use `async/await` for asynchronous operations
- Always handle promises with proper error catching or try/catch blocks
- Route handlers should be `async` when using async functions

### Routing (Express)
- Use route parameters for dynamic paths (e.g., `/stream/:filename`)
- Set appropriate headers for streaming responses (`Content-Type`, `Cache-Control`, `Connection`)
- Use `res.flushHeaders()` before streaming
- Access query parameters via `req.query.paramName`

### Markdown Rendering
- Parse Markdown to HTML using `marked.parse()`
- Process HTML elements in order: code blocks first, then inline elements
- Convert Shiki tokens to ANSI using the `tokensToANSI` helper
- Use `chalk` for terminal colors and styles

### Best Practices
- Define constants at module level (e.g., `PORT`, `CONTENT_DIR`, `SUPPORTED_THEMES`)
- Use `path.join()` for path construction, not string concatenation
- Set `chalk.level = 3` for truecolor terminal output
- Use `fs.mkdirSync(CONTENT_DIR, { recursive: true })` to create directories safely
- Cache expensive resources (like Shiki highlighter) in module-level variables
- Extract complex logic into separate functions (e.g., `tokensToANSI`, `renderTable`)

## Project Structure

```
/home/dev/term-server/webserv
├── server.js          # Main server file with all routes and rendering logic
├── package.json       # Dependencies and scripts
├── content/           # Markdown files to serve
│   ├── demo.md        # Default demo file
│   └── *.md           # Other markdown files
└── node_modules/      # Dependencies
```

## Common Tasks

### Adding a new route
```javascript
app.get('/path/:param', async (req, res) => {
  const theme = req.query.theme || DEFAULT_THEME;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  // ...
});
```

### Reading a markdown file
```javascript
const filePath = path.join(CONTENT_DIR, filename + '.md');
if (!fs.existsSync(filePath)) {
  res.status(404).send(chalk.red('File not found: ' + filename));
  return;
}
const content = fs.readFileSync(filePath, 'utf-8');
```

### Streaming response
```javascript
res.setHeader('Content-Type', 'text/plain; charset=utf-8');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.flushHeaders();

for (const char of text) {
  res.write(char);
  await new Promise(resolve => setTimeout(resolve, delay));
}
res.end();
```

### Using Shiki for code highlighting
```javascript
const highlighter = await shiki.createHighlighter({
  themes: ['nord'],
  langs: ['javascript']
});

const result = highlighter.codeToTokens(code, {
  lang: 'javascript',
  theme: 'nord'
});

const ansiOutput = tokensToANSI(result.tokens);
```

## Dependencies

- **express**: Web framework for handling HTTP routes
- **marked**: Markdown parser for converting MD to HTML
- **shiki**: VS Code's syntax highlighter (TextMate grammars)
- **table**: Terminal table rendering with Unicode borders
- **chalk**: Colored terminal output

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port number | 3000 |
| DEFAULT_THEME | Default syntax highlighting theme | vitesse-dark |
| DEBUG | Enable debug logging (1/true) | - |

## Supported Themes

8 themes are available for syntax highlighting:
- `vitesse-dark` (default)
- `nord`
- `github-dark`
- `one-dark-pro`
- `tokyo-night`
- `dracula`
- `material-theme`
- `catppuccin-mocha`

Use via query parameter: `?theme=nord`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | HTML documentation page |
| `/themes` | GET | JSON list of supported themes |
| `/files` | GET | JSON list of available markdown files |
| `/render` | GET | Render demo.md (non-streaming) |
| `/render/:filename` | GET | Render specified file (non-streaming) |
| `/stream` | GET | Stream demo.md character by character |
| `/stream/:filename` | GET | Stream specified file character by character |

Query parameters:
- `theme` - Syntax highlighting theme
- `delay` - Character delay for streaming (ms, default: 30)

## Troubleshooting

### Port already in use
```bash
lsof -i :3000
kill -9 <PID>
```

### Shiki theme not found
Ensure theme name matches Shiki's bundled themes exactly (e.g., `one-dark-pro`, not `one-dark`).

### Code blocks not highlighting
1. Check that the language is supported in the `langs` array in `getHighlighter()`
2. Ensure code blocks are processed before inline code elements
3. Verify `chalk.level = 3` is set for truecolor support

### Table rendering issues
Tables require proper `<thead>` and `<tbody>` structure. Use `marked` to parse markdown tables correctly.
