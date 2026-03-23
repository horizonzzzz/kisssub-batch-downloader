# Anime BT Batch Downloader

[English](README.md) | [简体中文](README.zh-CN.md)

Anime BT Batch Downloader 是一个开源浏览器扩展，用于把受支持的动漫 BT 源站页面中的条目批量提交到 qBittorrent。它会在列表页注入轻量选择 UI，后台打开选中的详情页，解析真实的磁力链或种子地址，完成去重后统一提交到 `qBittorrent WebUI`。

项目基于 `Plasmo + React 19 + TypeScript` 构建，并通过源站适配器组织站点逻辑，使扩展可以从单站脚本逐步演进为可复用的多源站动漫 BT 工具。

## 功能特性

- 直接在受支持的动漫 BT 源站列表页批量勾选条目
- 当前已支持的源站适配器：`kisssub.org` 与 `dongmanhuayuan.com`
- 通过站点专属提取逻辑解析详情页中的真实下载地址
- 优先使用磁力链接，必要时回退到种子文件地址
- 在提交前按 `btih` 哈希或最终 URL 去重
- 一次性把选中条目提交到 `qBittorrent WebUI`
- 支持为当前批次单独指定下载目录

## 支持源站

- `kisssub.org`
- `dongmanhuayuan.com`

## 环境要求

- Node.js
- pnpm
- Chromium 内核浏览器，例如 `Chrome` 或 `Edge`
- 已启用 `WebUI` 的 qBittorrent

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

## 配置 qBittorrent WebUI

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

## 使用方式

1. 打开受支持的源站列表页
2. 勾选想要下载的条目
3. 如有需要，在浮动面板里填写当前批次的下载目录
4. 点击 `批量下载`

随后扩展会：

1. 在后台打开选中的详情页
2. 在需要时注入远程辅助脚本
3. 解析真实的磁力链或种子地址
4. 去重重复条目
5. 把最终结果提交到 qBittorrent

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

- `background.ts`：扩展 service worker 与批量调度逻辑
- `contents/`：内容脚本入口与注入样式
- `components/`：浮动批量面板与配置页 UI
- `lib/sources/`：源站适配器与站点专属提取逻辑
- `lib/`：通用设置、qB API 辅助函数与批处理工具
- `tests/`：单元测试、组件测试与 Playwright E2E 测试

## 测试

提交修改前建议运行完整验证：

```bash
pnpm test:all
```

当前自动化覆盖包括源站识别、候选条目标准化、详情页提取逻辑、qBittorrent 提交流程、配置页行为，以及扩展级别的 E2E 校验。

## 已知限制

- 目前仍只支持 qBittorrent 作为下载器
- 还没有任务取消流程
- 暂不支持标签、分类等高级 qBittorrent 参数
- `kisssub` 的提取流程仍依赖第三方辅助脚本及上游页面当前行为

## 许可证

本项目基于 MIT License 开源。详见 [LICENSE](LICENSE)。
