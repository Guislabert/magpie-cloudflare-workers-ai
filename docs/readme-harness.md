# Readme Harness 使用版本记录

> 本仓 README 的排版/徽章布局基于 readme-harness 布局基线完成。记录当时的 harness 版本，
> 供 harness 升级后比对本基线、以及回溯布局依据。

## 当前基线

## 哲学（architecture unified, section & content free）

本仓 README 遵循 readme-harness 的**架构统一 + section/内容自由**哲学（SPEC §1a）：
头布局（hero→badges→居中H1→描述→NOTE→语言切换）统一；但 section 内容、
项目深度的详细介绍由本仓自定义，不受 harness 锁死——可加任意所需 section。



| 项 | 值 |
|---|---|
| readme-harness 版本 | v0.1.0 |
| commit | `8c65495` |
| 使用日期 | 2026-10-25 |
| 布局范式 | ClawBench landing layout |
| 源仓库 | https://github.com/Guislabert/readme-harness |
| 本地 clone | `/root/readme-harness`（配 cron 每小时同步） |

## 采用的头布局

1. hero `<a><picture>`（light/dark）
2. 引用式徽章（built→version→license 语义色）
3. `<h1 align="center">` 标题
4. blockquote 一句话描述
5. `> [!NOTE]` 证明块
6. 语言切换（居中）
7. `## Why` → … → `## License`
8. 尾部引用定义 + harness 版本标注

> **内容自由**：本节固定架构；各 section 的具体内容（模块表、方法链、示例等）由本仓自定，不受 harness 锁死。

## 升级提醒规则
1. harness 布局变更只提醒，不自动改本仓 README。
2. 更新由本仓/owner 决定；fork 或独立演化仓库不越权。
3. MAJOR 升级（breaking）收到提醒后按 `git log v0.1.0..HEAD` 比对逐项评估。
4. 本基线随 README 更新同步更新。
