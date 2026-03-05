const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const chalk = require('chalk');
const shiki = require('shiki');
const { table } = require('table');

chalk.level = 3;

const SUPPORTED_THEMES = [
  'vitesse-dark',
  'nord',
  'github-dark',
  'one-dark-pro',
  'tokyo-night',
  'dracula',
  'material-theme',
  'catppuccin-mocha'
];

const DEFAULT_THEME = process.env.DEFAULT_THEME || 'vitesse-dark';

const app = express();
const PORT = process.env.PORT || 3000;
const CONTENT_DIR = path.join(__dirname, 'content');

let highlighterInstance = null;

async function getHighlighter() {
  if (!highlighterInstance) {
    highlighterInstance = await shiki.createHighlighter({
      themes: SUPPORTED_THEMES,
      langs: ['javascript', 'typescript', 'python', 'rust', 'go', 'java', 'cpp', 'c', 'bash', 'json', 'html', 'css', 'sql', 'markdown', 'yaml', 'text']
    });
  }
  return highlighterInstance;
}

function tokensToANSI(tokens) {
  chalk.level = 3;
  
  let result = '';
  
  for (const line of tokens) {
    for (const token of line) {
      const { content, color, fontStyle } = token;
      
      let styled = content;
      
      if (color && !['#D8DEE9FF', '#D8DEE9', '#ECEFF4'].includes(color)) {
        try {
          const hex = color.replace(/FF$/, '');
          if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            styled = chalk.hex(hex)(styled);
          }
        } catch (e) {
          // Ignore color errors
        }
      }
      
      if (fontStyle & 1) styled = chalk.bold(styled);
      if (fontStyle & 2) styled = chalk.italic(styled);
      if (fontStyle & 4) styled = chalk.underline(styled);
      
      result += styled;
    }
    result += '\n';
  }
  
  return result;
}

async function highlightCode(code, lang, theme = DEFAULT_THEME) {
  try {
    const highlighter = await getHighlighter();
    
    if (!SUPPORTED_THEMES.includes(theme)) {
      theme = DEFAULT_THEME;
    }
    
    const safeLang = lang || 'text';
    
    try {
      const result = highlighter.codeToTokens(code, {
        lang: safeLang,
        theme: theme
      });
      
      const ansi = tokensToANSI(result.tokens);
      
      if (process.env.DEBUG) {
        console.error('Highlight debug:', { lang: safeLang, theme, codeLength: code.length, hasColor: ansi.includes('\x1b') });
      }
      
      return ansi;
    } catch (e) {
      console.error('Token generation error:', e.message);
      return chalk.gray(code);
    }
  } catch (error) {
    console.error('Shiki highlight error:', error.message);
    return chalk.gray(code);
  }
}

function renderTable(html) {
  const tableData = [];
  
  const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (theadMatch) {
    const headerRow = [];
    const cellPattern = /<th[^>]*>(.*?)<\/th>/gi;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(theadMatch[1])) !== null) {
      headerRow.push(chalk.bold(cellMatch[1].trim()));
    }
    if (headerRow.length > 0) {
      tableData.push(headerRow);
    }
  }
  
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const bodyContent = tbodyMatch ? tbodyMatch[1] : html;
  
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = rowPattern.exec(bodyContent)) !== null) {
    const row = [];
    const cellPattern = /<td[^>]*>(.*?)<\/td>/gi;
    let cellMatch;
    
    while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
      row.push(cellMatch[1].trim());
    }
    
    if (row.length > 0) {
      tableData.push(row);
    }
  }
  
  if (tableData.length === 0) {
    return '';
  }
  
  try {
    const config = {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinJoin: '┼',
        joinLeft: '├',
        joinRight: '┤'
      },
      columnDefault: {
        width: 20,
        wrapWord: true,
        truncate: 100
      }
    };
    
    return '\n' + table(tableData, config) + '\n';
  } catch (error) {
    console.error('Table render error:', error.message);
    return html;
  }
}

function processNestedLists(html) {
  const ulSymbols = ['•', '◦', '▪', '▫'];
  
  function parseList(listHtml, depth) {
    let result = '';
    const items = [];
    let current = '';
    let tagDepth = 0;
    let i = 0;
    
    while (i < listHtml.length) {
      if (listHtml.substring(i, i + 4) === '<li>') {
        if (tagDepth === 0 && current.trim()) {
          items.push({ content: current.trim(), nested: null });
        }
        current = '';
        i += 4;
        continue;
      }
      if (listHtml.substring(i, i + 5) === '</li>') {
        items.push({ content: current.trim(), nested: null });
        current = '';
        i += 5;
        continue;
      }
      if (listHtml.substring(i, i + 4) === '<ul>' || listHtml.substring(i, i + 4) === '<ol>') {
        if (items.length > 0 && !items[items.length - 1].nested) {
          const startTag = listHtml.substring(i, i + 4);
          const endTag = startTag === '<ul>' ? '</ul>' : '</ol>';
          let nestedStart = i;
          let nestedDepth = 1;
          i += 4;
          
          while (i < listHtml.length && nestedDepth > 0) {
            if (listHtml.substring(i, i + 4) === startTag) {
              nestedDepth++;
            } else if (listHtml.substring(i, i + 5) === endTag) {
              nestedDepth--;
            }
            i++;
          }
          
          const nestedHtml = listHtml.substring(nestedStart, i);
          items[items.length - 1].nested = nestedHtml;
          continue;
        }
      }
      current += listHtml[i];
      i++;
    }
    
    for (const item of items) {
      const indent = '  '.repeat(depth);
      const symbol = ulSymbols[depth % ulSymbols.length];
      const cleanContent = item.content.replace(/<[^>]+>/g, '').trim();
      
      if (cleanContent) {
        result += `${indent}${symbol} ${chalk.cyan(cleanContent)}\n`;
      }
      
      if (item.nested) {
        const nestedResult = parseList(item.nested, depth + 1);
        result += nestedResult;
      }
    }
    
    return result;
  }
  
  let result = html;
  const listPattern = /<(ul|ol)>([\s\S]*?)<\/\1>/gi;
  
  while (listPattern.test(result)) {
    result = result.replace(listPattern, (match, type, content) => {
      return '\n' + parseList(content, 0);
    });
  }
  
  return result;
}

async function renderToTerminal(html, theme = DEFAULT_THEME) {
  let text = html;
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (_, content) => {
    return '\n' + chalk.yellow.bold.underline(content) + '\n';
  });
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (_, content) => {
    return '\n' + chalk.yellow.bold(content) + '\n';
  });
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (_, content) => {
    return '\n' + chalk.cyan.bold(content) + '\n';
  });
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, (_, content) => {
    return '\n' + chalk.cyan(content) + '\n';
  });
  text = text.replace(/<h5[^>]*>(.*?)<\/h5>/gi, (_, content) => {
    return '\n' + chalk.green(content) + '\n';
  });
  text = text.replace(/<h6[^>]*>(.*?)<\/h6>/gi, (_, content) => {
    return '\n' + chalk.green(content) + '\n';
  });
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, (_, content) => {
    return chalk.bold(content);
  });
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, (_, content) => {
    return chalk.bold(content);
  });
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, (_, content) => {
    return chalk.italic(content);
  });
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, (_, content) => {
    return chalk.italic(content);
  });
  text = text.replace(/<(?:del|s)[^>]*>(.*?)<\/(?:del|s)>/gi, (_, content) => {
    return chalk.strikethrough(content);
  });
  
  const codeBlockPattern = /<pre[^>]*><code[^>]* class="language-(\w+)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi;
  let match;
  const codeBlocks = [];
  
  while ((match = codeBlockPattern.exec(text)) !== null) {
    codeBlocks.push({
      full: match[0],
      lang: match[1],
      code: match[2]
    });
  }
  
  if (process.env.DEBUG) {
    console.error(`Found ${codeBlocks.length} code blocks with language`);
  }
  
  for (const block of codeBlocks) {
    let decoded = block.code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    if (process.env.DEBUG) {
      console.error(`Processing code block: lang=${block.lang}, code length=${decoded.length}`);
    }
    const highlighted = await highlightCode(decoded, block.lang, theme);
    text = text.replace(block.full, '\n' + highlighted + '\n');
  }
  
  const plainCodeBlockPattern = /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi;
  const plainCodeBlocks = [];
  
  while ((match = plainCodeBlockPattern.exec(text)) !== null) {
    plainCodeBlocks.push({
      full: match[0],
      code: match[1]
    });
  }
  
  for (const block of plainCodeBlocks) {
    let decoded = block.code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    const highlighted = await highlightCode(decoded, 'text', theme);
    text = text.replace(block.full, '\n' + highlighted + '\n');
  }
  
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, (_, content) => {
    return chalk.bgBlack.gray(content);
  });
  
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.map(l => chalk.gray('│ ' + l.replace(/<[^>]+>/g, ''))).join('\n') + '\n';
  });
  
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  
  while ((tableMatch = tablePattern.exec(text)) !== null) {
    const tableHtml = tableMatch[1];
    const renderedTable = renderTable(tableHtml);
    text = text.replace(tableMatch[0], renderedTable);
  }
  
  text = processNestedLists(text);
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, (_, content) => {
    return content + '\n';
  });
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (_, url, text) => {
    return chalk.blue.underline(text) + ' (' + url + ')';
  });
  text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, (_, alt, src) => {
    return chalk.magenta('[图片: ' + alt + ']') + ' (' + src + ')';
  });
  text = text.replace(/<hr[^>]*>/gi, () => {
    return chalk.gray('─'.repeat(50)) + '\n';
  });
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text;
}

async function streamMarkdown(res, filename, delay, theme) {
  const filePath = path.join(CONTENT_DIR, filename + '.md');
  
  if (!fs.existsSync(filePath)) {
    res.write(chalk.red('文件不存在: ' + filename));
    res.end();
    return;
  }

  const markdown = fs.readFileSync(filePath, 'utf-8');
  const html = marked.parse(markdown);
  const terminalText = await renderToTerminal(html, theme);
  
  const chars = Array.from(terminalText);
  
  for (let i = 0; i < chars.length; i++) {
    res.write(chars[i]);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  res.end();
}

app.get('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  const delay = parseInt(req.query.delay) || 30;
  const theme = req.query.theme || DEFAULT_THEME;
  await streamMarkdown(res, 'demo', delay, theme);
});

app.get('/stream/:filename', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  const delay = parseInt(req.query.delay) || 30;
  const theme = req.query.theme || DEFAULT_THEME;
  await streamMarkdown(res, req.params.filename, delay, theme);
});

app.get('/render', async (req, res) => {
  const filePath = path.join(CONTENT_DIR, 'demo.md');
  if (!fs.existsSync(filePath)) {
    res.status(404).send(chalk.red('文件不存在: demo'));
    return;
  }
  const theme = req.query.theme || DEFAULT_THEME;
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const html = marked.parse(markdown);
  const terminalText = await renderToTerminal(html, theme);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(terminalText);
});

app.get('/render/:filename', async (req, res) => {
  const filePath = path.join(CONTENT_DIR, req.params.filename + '.md');
  if (!fs.existsSync(filePath)) {
    res.status(404).send(chalk.red('文件不存在: ' + req.params.filename));
    return;
  }
  const theme = req.query.theme || DEFAULT_THEME;
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const html = marked.parse(markdown);
  const terminalText = await renderToTerminal(html, theme);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(terminalText);
});

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Markdown Stream Server</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    .example { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 8px; margin: 10px 0; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>📖 Markdown Stream Server</h1>
  <p>流式输出Markdown渲染内容的服务</p>
  
  <h2>使用示例</h2>
  <h3>流式输出</h3>
  <div class="example">
    <code>curl -N http://localhost:${PORT}/stream</code><br>
    <code>curl -N http://localhost:${PORT}/stream/demo</code><br>
    <code>curl -N http://localhost:${PORT}/stream/demo?delay=50</code><br>
    <code>curl -N http://localhost:${PORT}/stream/demo?theme=nord</code>
  </div>
  
  <h3>直接渲染</h3>
  <div class="example">
    <code>curl http://localhost:${PORT}/render</code><br>
    <code>curl http://localhost:${PORT}/render/demo</code><br>
    <code>curl http://localhost:${PORT}/render/demo?theme=github-dark</code>
  </div>
  
  <h2>参数说明</h2>
  <ul>
    <li><code>:filename</code> - Markdown文件名（不含扩展名）</li>
    <li><code>delay</code> - 每个字符的延迟（毫秒），默认30ms（仅流式输出）</li>
    <li><code>theme</code> - 代码高亮主题，默认: vitesse-dark</li>
  </ul>
  
  <h2>支持的主题</h2>
  <div class="example">
    <code>curl http://localhost:${PORT}/themes</code>
  </div>
  <ul id="themes"></ul>
  
  <h2>可用文件</h2>
  <ul id="files"></ul>
  
  <script>
    fetch('/files').then(r => r.json()).then(files => {
      const ul = document.getElementById('files');
      files.forEach(f => {
        const li = document.createElement('li');
        li.innerHTML = '<code>' + f + '</code>';
        ul.appendChild(li);
      });
    });
    
    fetch('/themes').then(r => r.json()).then(data => {
      const ul = document.getElementById('themes');
      data.themes.forEach(t => {
        const li = document.createElement('li');
        li.innerHTML = '<code>' + t + '</code>' + (t === data.default ? ' (默认)' : '');
        ul.appendChild(li);
      });
    });
  </script>
</body>
</html>
  `);
});

app.get('/files', (req, res) => {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
  res.json(files);
});

app.get('/themes', (req, res) => {
  res.json({
    default: DEFAULT_THEME,
    themes: SUPPORTED_THEMES
  });
});

if (!fs.existsSync(CONTENT_DIR)) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

app.listen(PORT, () => {
  console.log(chalk.green(`🚀 服务已启动: http://localhost:${PORT}`));
  console.log(chalk.gray(`📁 内容目录: ${CONTENT_DIR}`));
  console.log(chalk.gray(`🎨 默认主题: ${DEFAULT_THEME}`));
  console.log(chalk.gray(`💡 使用 ?theme=主题名 切换主题`));
});
