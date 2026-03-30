# md2term-webserv

[English](./README_EN.md) | 简体中文

一个将 Markdown 渲染为终端友好文本的 HTTP 服务。支持语法高亮、表格渲染、流式输出和多主题切换。

## 特性

- **终端渲染** - 将 Markdown 转换为带有 ANSI 颜色代码的终端输出
- **语法高亮** - 使用 Shiki（VS Code 同款 TextMate 语法引擎）进行代码高亮
- **表格支持** - 使用 Unicode 边框渲染美观的终端表格，支持自动宽度适配
- **流式输出** - 支持逐字符流式传输，模拟打字机效果
- **多主题支持** - 内置 8 种语法高亮主题
- **简单易用** - 通过 HTTP API 直接访问，无需客户端

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
npm start
```

服务默认运行在 3000 端口（可通过 `PORT` 环境变量配置）。

### 快速测试

```bash
# 渲染默认文件
curl http://localhost:3000/render

# 获取原始 Markdown 内容
curl http://localhost:3000/raw/demo

# 流式输出
curl -N http://localhost:3000/stream

# 指定主题
curl http://localhost:3000/render/demo?theme=nord
```

## API 文档

### 端点列表

| 端点 | 方法 | 描述 |
|------|------|------|
| `/` | GET | HTML 文档页面 |
| `/themes` | GET | 获取支持的主题列表（JSON） |
| `/files` | GET | 获取可用的 Markdown 文件列表（JSON） |
| `/render` | GET | 渲染 demo.md（非流式） |
| `/render/:filename` | GET | 渲染指定文件（非流式） |
| `/stream` | GET | 流式输出 demo.md |
| `/stream/:filename` | GET | 流式输出指定文件 |
| `/raw/:file` | GET | 返回原始 Markdown 内容（无渲染） |

### 查询参数

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `theme` | 语法高亮主题 | vitesse-dark |
| `delay` | 流式输出字符间隔（毫秒） | 30 |
| `autofit` | 自动适配表格列宽到终端宽度 | true |
| `minWidth` | 表格最小列宽（字符数） | 10 |
| `maxWidth` | 表格最大列宽（字符数） | 50 |

### 使用示例

```bash
# 获取支持的主题
curl http://localhost:3000/themes

# 获取可用的文件列表
curl http://localhost:3000/files

# 渲染指定文件
curl http://localhost:3000/render/test

# 获取原始 Markdown 内容
curl http://localhost:3000/raw/test

# 使用 Tokyo Night 主题渲染
curl http://localhost:3000/render/test?theme=tokyo-night

# 流式输出，字符间隔 50ms
curl -N http://localhost:3000/stream/test?delay=50

# 使用 Dracula 主题流式输出
curl -N http://localhost:3000/stream/test?theme=dracula

# 表格自动适配（默认）
curl http://localhost:3000/render/table-demo

# 禁用表格自动适配
curl http://localhost:3000/render/table-demo?autofit=false

# 自定义表格列宽范围
curl http://localhost:3000/render/table-demo?minWidth=15&maxWidth=30

# 固定表格列宽
curl http://localhost:3000/render/table-demo?autofit=false&minWidth=15&maxWidth=15
```

## 支持的主题

共支持 8 种语法高亮主题：

- `vitesse-dark` (默认)
- `nord`
- `github-dark`
- `one-dark-pro`
- `tokyo-night`
- `dracula`
- `material-theme`
- `catppuccin-mocha`

## 支持的 Markdown 语法

- 标题（H1-H6）
- 段落
- 有序/无序列表
- 代码块（带语法高亮）
- 行内代码
- 表格（Unicode 边框）
- 链接
- 图片（显示为 `[图片: alt]` 格式）
- 引用块
- 分割线
- 粗体、斜体、删除线

## 项目结构

```
md2term-webserv/
├── server.js          # 主服务器文件
├── package.json       # 依赖配置
├── AGENTS.md          # 开发指南
├── README.md          # 中文文档
├── README_EN.md       # 英文文档
└── content/           # Markdown 内容目录
    ├── demo.md        # 默认演示文件
    └── *.md           # 其他 Markdown 文件
```

## 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 3000 |
| `DEFAULT_THEME` | 默认语法高亮主题 | vitesse-dark |
| `DEBUG` | 启用调试日志（1/true） | - |

## 依赖

- **express** - Web 框架
- **marked** - Markdown 解析器
- **shiki** - VS Code 的语法高亮引擎
- **table** - 终端表格渲染
- **chalk** - 终端彩色输出

## 常见问题

### 端口被占用

```bash
lsof -i :3000
kill -9 <PID>
```

### 代码高亮不生效

1. 确保语言名称正确（如 `javascript`、`python`）
2. 确保终端支持 TrueColor（24位颜色）
3. 检查 `chalk.level = 3` 是否设置

### 表格显示异常

1. 确保 Markdown 表格格式正确，包含表头和分隔行
2. 如果表格宽度超出终端，使用 `autofit=true`（默认）自动适配
3. 调整 `minWidth` 和 `maxWidth` 参数控制列宽范围
4. 示例：`curl http://localhost:3000/render/table-demo?minWidth=15&maxWidth=30`

## 开发

详细的开发指南请参阅 [AGENTS.md](./AGENTS.md)。

## 许可证

MIT
