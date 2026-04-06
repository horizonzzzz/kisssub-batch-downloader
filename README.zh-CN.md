# Anime BT Batch Downloader

[English](README.md) | [简体中文](README.zh-CN.md)

Anime BT Batch Downloader 是一个开源浏览器扩展，用于把受支持的动漫 BT 源站页面中的条目批量提交到当前选中的下载器。它会在列表页注入轻量选择 UI，优先复用源站已经公开的磁力链或种子地址，必要时再后台打开选中的详情页提取真实下载链接，完成去重后统一提交到 `qBittorrent WebUI` 或 `Transmission RPC`。

项目基于 `WXT + React 19 + TypeScript` 构建，并通过源站适配器组织站点逻辑，使扩展可以从单站脚本逐步演进为可复用的多源站动漫 BT 工具。

## 功能特性

- 直接在受支持的动漫 BT 源站列表页批量勾选条目
- 当前已支持的源站适配器：`kisssub.org`、`dongmanhuayuan.com`、`acg.rip` 与 `bangumi.moe`
- 源站若已在列表页公开稳定的 `.torrent` 地址，会优先直接提交
- 通过站点专属提取逻辑解析详情页中的真实下载地址
- 优先使用磁力链接，必要时回退到种子文件地址
- 在提交前按 `btih` 哈希或最终 URL 去重
- 一次性把选中条目提交到当前下载器
- 当前支持的下载器：`qBittorrent WebUI` 与 `Transmission RPC`
- 支持为当前批次单独指定下载目录

## 支持源站

- `kisssub.org`
- `dongmanhuayuan.com`
- `acg.rip`
- `bangumi.moe`

## 环境要求

- Node.js
- pnpm
- Chromium 内核浏览器，例如 `Chrome` 或 `Edge`
- 已启用 `WebUI` 的 qBittorrent，或已启用 `RPC` 的 Transmission

## 安装

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建扩展

```bash
pnpm build
```

### 3. 本地加载扩展

1. 打开 `chrome://extensions` 或 `edge://extensions`
2. 开启开发者模式
3. 点击 `加载已解压的扩展程序`
4. 选择 `build/chrome-mv3-prod`

## 配置下载器

### qBittorrent WebUI

1. 打开 `qBittorrent -> 工具 / 选项 / WebUI`
2. 启用 `WebUI`
3. 打开扩展配置页并填写：
   - `qBittorrent WebUI` 地址
   - 用户名
   - 密码
4. 使用 `测试 qB 连接` 校验连通性

本地默认地址示例：

```text
http://127.0.0.1:7474
```

如果 qBittorrent 仅在本机使用，但扩展仍返回 `401`，请检查这些 WebUI 选项：

- `Enable Cross-Site Request Forgery (CSRF) protection`
- `Host header validation`

### Transmission RPC

1. 启用 Transmission 的 RPC 服务
2. 打开扩展配置页，把当前下载器切换为 `Transmission`
3. 填写：
   - `Transmission RPC` 地址
   - 用户名
   - 密码
4. 使用 `测试 Transmission 连接` 校验连通性

本地默认地址示例：

```text
http://127.0.0.1:9091/transmission/rpc
```

## 使用方式

1. 打开受支持的源站列表页
2. 勾选想要下载的条目
3. 如有需要，在浮动面板里填写当前批次的下载目录
4. 点击 `批量下载`

随后扩展会：

1. 优先复用列表页已经公开的磁力链或 `.torrent` 地址
2. 若列表页没有可直接提交的地址，再在后台打开选中的详情页
3. 在需要时注入远程辅助脚本
4. 解析真实的磁力链或种子地址
5. 去重重复条目
6. 把最终结果提交到当前下载器

## 开发

### 常用脚本

```bash
pnpm dev
pnpm build
pnpm package
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:all
```

### 项目结构

- `src/entrypoints/background/`：WXT background 入口与 background 专属运行时 bootstrap
- `src/entrypoints/popup/` 与 `src/entrypoints/options/`：WXT HTML + React 页面入口，样式与入口同目录管理
- `src/entrypoints/source-batch.content/`：WXT 内容脚本入口、运行时 bootstrap 与内容样式入口
- `src/components/`：浮动批量面板与配置页 UI
- `src/lib/sources/`：源站适配器与站点专属提取逻辑
- `src/lib/`：通用设置、下载器适配器、运行时消息与批处理工具
- `tests/`：单元测试、组件测试与 Playwright E2E 测试

## 测试

提交修改前建议运行完整验证：

```bash
pnpm test:all
```

当前自动化覆盖包括源站识别、候选条目标准化、详情页提取逻辑、qBittorrent 与 Transmission 提交流程、配置页行为，以及扩展级别的 E2E 校验。

## 已知限制

- 还没有任务取消流程
- 暂不支持 qBittorrent 标签/分类、Transmission 标签等高级下载器参数
- `kisssub` 的提取流程仍依赖第三方辅助脚本及上游页面当前行为

## 许可证

本项目基于 MIT License 开源。详见 [LICENSE](LICENSE)。
