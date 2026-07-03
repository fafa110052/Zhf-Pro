# 防重复提交方案设计

**日期：** 2026-07-03
**目的：** 防止用户快速双击或网络重试导致同一表单数据被重复创建

## 方案概述

**双重保护：前端按钮禁用 + 后端请求指纹去重**

| 层级 | 机制 | 作用 |
|------|------|------|
| 前端 | 提交按钮在请求完成前保持 disabled+loading | 挡快速双击 |
| 后端 | 请求指纹去重中间件（30秒窗口） | 挡网络重发、绕过前端的重复请求 |

---

## 一、后端：请求指纹去重中间件

### 工作原理

```
请求到达 → 提取 用户ID + 接口路径 + 请求体哈希 → 查询内存缓存
                                                    ↓
                                          ┌─ 30秒内出现过？──┐
                                          ↓                  ↓
                                        否                  是
                                          ↓                  ↓
                                     执行请求          返回 409
                                     缓存指纹+结果     "请勿重复提交"
```

### 指纹计算

```
fingerprint = SHA256(userId + ":" + method + ":" + path + ":" + JSON.stringify(body))
```

- 未登录用户：userId = req.ip
- 仅对 POST / PUT / PATCH 生效
- GET / DELETE 不拦截（DELETE 天然幂等）

### 存储

- 使用 `Map<string, { timestamp, fingerprint }>`
- 每 60 秒清理一次过期指纹（超过 30 秒的）
- 内存占用极小（假设 1000 个活跃用户同时提交 = ~200KB）

### 去重窗口

- **30 秒**：足够覆盖大多数网络抖动恢复场景
- 窗口可配置（`DEDUP_WINDOW_MS`）

### 响应

- 重复提交返回 HTTP 409
- 消息："请勿重复提交"

### 保护范围

所有 POST / PUT / PATCH 路由（共 67 个接口），通过全局中间件统一覆盖。

### 不需要去重的接口

- `POST /auth/*` 登录接口（用户可能短时间内多次尝试登录，不同密码）
- 已登录 + body 为空时跳过（纯粹的状态变更类接口）

处理方式：中间件自动跳过 body 为空的请求。

---

## 二、前端：按钮防抖

### 小程序端

已有良好基础：大部分表单按钮已使用 `loading="{{submitting}}"` + `disabled="{{submitting}}"`。

需检查并补全以下页面：
- [x] `work-upload` — 已有 saving/submitting 状态
- [x] `designer-login` — 已有 loading 状态
- [x] `designer-task-detail` — 已有 uploading 状态
- [x] `engineer-task-detail` — 已有 uploading/acting 状态
- [x] `material-submit` — 已有 submitting 状态
- [ ] 审核/驳回弹窗按钮 — 已有 rejecting 状态，需补全

**增强措施：** 在 `utils/` 下添加 `debounce.js` 工具，提供页面级防抖 Mixin。

### H5 端

React 组件，按钮需确保：
- `onClick` handler 中设置 loading state
- button 添加 `disabled={loading}` 属性
- 请求完成（成功或失败）后恢复

**增强措施：** 在 `hooks/` 下添加 `useSubmitLock` 自定义 Hook。

---

## 三、实现步骤

1. **后端：** 创建 `middleware/dedup.js` → 在 `app.js` 中注册
2. **小程序：** 创建 `utils/debounce.js` → 检查并补全所有提交页面
3. **H5：** 创建 `hooks/useSubmitLock.js` → 应用到表单页面
4. **验证：** curl 模拟重复提交测试后端；真机测试前端

---

## 四、不做的事

- 不做「幂等键」方案（需要客户端生成唯一 ID，改动太大，B 端不需要）
- 不做 Redis 分布式缓存（当前单服务器，内存 Map 足够）
- 不做 IP 限流（与去重是不同层级的问题，后续可叠加）
