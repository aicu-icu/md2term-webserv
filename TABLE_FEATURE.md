# 表格自动适配功能说明

## 功能概述

为了解决表格在终端渲染时宽度超出屏幕导致边框错乱的问题，实现了表格自动宽度适配功能。

## 实现方案

### 核心逻辑

表格宽度动态计算公式：
```
可用宽度 = 终端宽度 - 边框开销
单列宽度 = min(max(可用宽度 ÷ 列数, minWidth), maxWidth)
```

其中：
- 终端宽度：通过 `process.stdout.columns` 获取，默认 80 列
- 边框开销：每列约占 3 个字符（左右边框 + 分隔符）
- `minWidth` 和 `maxWidth` 用于限制列宽范围

### 代码改动

#### 1. renderTable 函数（server.js:107-178）
- 添加 `options` 参数，支持 `autoFit`、`minWidth`、`maxWidth` 配置
- 实现动态宽度计算逻辑
- 支持调试输出（通过 `DEBUG=1` 环境变量）

#### 2. renderToTerminal 函数（server.js:261）
- 添加 `tableOptions` 参数
- 传递给 `renderTable` 调用

#### 3. 路由处理函数（server.js:403-451）
- 从查询参数读取表格配置
- 支持所有 `/render` 和 `/stream` 路由

#### 4. 文档更新
- HTML 文档页面添加参数说明
- AGENTS.md 添加使用指南和故障排除

## API 参数

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `autofit` | boolean | true | 自动适配终端宽度 |
| `minWidth` | number | 10 | 最小列宽（字符数） |
| `maxWidth` | number | 50 | 最大列宽（字符数） |

## 使用示例

### 1. 默认自动适配
```bash
curl http://localhost:3000/render/table-demo
```
表格列宽自动计算以适配终端宽度

### 2. 禁用自动适配
```bash
curl http://localhost:3000/render/table-demo?autofit=false
```
使用固定列宽（默认 20 字符）

### 3. 自定义宽度范围
```bash
curl http://localhost:3000/render/table-demo?minWidth=15&maxWidth=30
```
列宽限制在 15-30 字符之间

### 4. 固定宽度
```bash
curl http://localhost:3000/render/table-demo?autofit=false&minWidth=15&maxWidth=15
```
所有列使用固定 15 字符宽度

## 测试结果

### 默认自动适配
- **8列表格**：每列约 12 字符，总宽度适配终端
- **2列表格**：每列约 38 字符，充分利用空间

### 禁用自动适配
- 所有表格固定 20 字符宽度
- 宽表格总宽度超出终端，内容自动换行

### 自定义宽度范围
- **minWidth=15, maxWidth=25**：
  - 8列表格：每列 17 字符
  - 2列表格：每列 27 字符（达到上限）

## 技术细节

### 宽度计算

```javascript
if (autoFit) {
  const terminalWidth = process.stdout.columns || 80;
  const columnCount = tableData[0].length;
  const borderOverhead = columnCount * 3 + 1;
  const availableWidth = terminalWidth - borderOverhead;
  columnWidth = Math.min(
    Math.max(Math.floor(availableWidth / columnCount), minWidth),
    maxWidth
  );
}
```

### 边框开销说明

边框开销包括：
- 每列左右边框：2 个字符
- 列间分隔符：1 个字符
- 首尾边框：1 个字符

简化公式：`borderOverhead = columnCount * 3 + 1`

### 兼容性考虑

1. **终端宽度检测**：`process.stdout.columns` 在管道输出时可能返回 `undefined`，默认使用 80
2. **参数验证**：无效参数时自动使用默认值
3. **向后兼容**：默认行为与原有实现一致

## 测试文件

`content/table-demo.md` 包含多种表格类型：
- 宽表格（8列）
- 窄表格（2列）
- 长内容表格
- 多列表格（10列）

## 未来改进

可能的功能增强：
1. 根据内容智能分配列宽（而非平均分配）
2. 支持特定列的宽度配置
3. 横向滚动支持（当表格无法适配时）
4. 表格宽度警告提示
