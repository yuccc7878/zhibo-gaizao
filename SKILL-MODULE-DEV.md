# 🛠️ 模块开发标准作业流程 (SOP)

> 适用于 `zhibo-gaizao` 项目新增功能模块。
> 所有 AI 调用统一使用 `AiService`，禁止内联 fetch。

---

## 目录

1. [架构概览](#1-架构概览)
2. [AI 服务层 AiService](#2-ai-服务层-aiservice)
3. [创建新模块：完整步骤](#3-创建新模块完整步骤)
4. [AI 文字调用规范](#4-ai-文字调用规范)
5. [AI 图片生成规范](#5-ai-图片生成规范)
6. [流式输出规范](#6-流式输出规范)
7. [数据持久化规范](#7-数据持久化规范)
8. [UI 与交互规范](#8-ui-与交互规范)
9. [Checklist](#9-checklist)

---

## 1. 架构概览

```
zhibo-gaizao/
├── 章鱼喷墨机.html            ← 入口页面
│   ├── <script src="js/core/aiService.js">   ← ★ AI 服务（最先加载）
│   ├── <script src="engine/db.js">           ← 数据库
│   ├── <script src="engine/ui.js">           ← UI 工具
│   ├── <script src="engine/core.js">         ← 模块引擎 + 服务桥接
│   ├── <script src="modules/xxx/xxx.js">     ← 各功能模块
│   └── <script src="app.js">                 ← 聊天室主逻辑
│
├── js/core/aiService.js       ← ★ AiService 全局对象
├── engine/core.js             ← Engine.register + Engine.services
├── modules/                   ← 功能模块目录
│   ├── shop/ live/ gacha/ games/ album/ media/ bilibili/ wardrobe/
│   └── my-new-module/         ← 你的新模块
└── assets/
```

### 模块注册系统

所有模块通过 `Engine.register()` 注册，通过 `Engine.services` 访问共享能力：

```js
Engine = {
    modules: {},
    register(module) {},       // 注册模块
    getModule(id) {},          // 获取模块
    getAllModules() {},         // 获取所有模块（按 order 排序）
    initAll() {},              // 初始化所有模块（调用 init()）
    openModule(id) {},         // 打开模块（调用 open()）
    services: {
        // 数据
        db, saveData, loadData,
        // UI
        switchScreen, showToast, pad, compressImage, ...
        // ★ AI（统一入口）
        aiChat(opts),
        aiGenerateImage(prompt, options),
        aiFetchModels(url, key, provider),
        syncAiConfig(),
    }
};
```

---

## 2. AI 服务层 AiService

### 全局对象

`js/core/aiService.js` 通过 `window.AiService` 暴露所有能力：

```js
window.AiService = {
    // 配置
    setChatConfig(config),       // { provider, url, key, model }
    setImageConfig(config),      // { url, key, model }
    getChatConfig(),
    getImageConfig(),
    // 核心方法
    chat(opts),                  // AI 对话
    generateImage(prompt, opt),  // 图片生成
    fetchModels(url, key, prov), // 模型列表
    // 错误类
    AiServiceError,
};
```

### 两种调用方式

| 方式 | 适用场景 | 示例 |
|------|---------|------|
| `Engine.services.aiChat()` | 模块中调用（自动同步配置） | `const text = await Engine.services.aiChat({...})` |
| `Engine.services.aiGenerateImage()` | 模块中调用生图 | `const url = await Engine.services.aiGenerateImage(prompt)` |
| `window.AiService.chat()` | 非模块环境（需手动配置） | 需先调 `setChatConfig()` |

**模块中一律使用 `Engine.services.aiChat()`**，它会自动从 `db` 读取 API 配置并同步。

### 支持的 Provider

| Provider | 端点格式 | 备注 |
|----------|---------|------|
| `newapi` | OpenAI 兼容 `/v1/chat/completions` | 自定义 API |
| `deepseek` | OpenAI 兼容 | DeepSeek |
| `claude` | OpenAI 兼容 | Anthropic |
| `gemini` | `/v1beta/models/{model}:generateContent` | Google Gemini |

AiService 内部自动适配，模块代码**无需关心 provider 差异**。

---

## 3. 创建新模块：完整步骤

### Step 1：创建目录和文件

```bash
mkdir -p modules/my-module
touch modules/my-module/my-module.js
# 如果需要样式
touch modules/my-module/my-module.css
```

### Step 2：编写模块代码

```js
/* ========================================
 * Module: MyModule（模块功能描述）
 * ======================================== */

Engine.register({
    id: 'my-module',
    name: '我的模块',
    icon: '🎯',
    screen: 'my-module-screen',
    order: 10,

    // ─── 状态 ───
    generating: false,

    // ─── 生命周期 ───
    init() {
        console.log('[MyModule] Initialized');
    },

    open() {
        switchScreen('my-module-screen');
        this._render();
    },

    // ─── 渲染 UI ───
    _render() {
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `
            <header class="app-header">
                <button class="back-btn" onclick="switchScreen('home-screen')">‹</button>
                <h1 class="title">${this.icon} ${this.name}</h1>
            </header>
            <main class="content" id="my-module-content">
                <button class="btn btn-primary" id="my-module-generate-btn">✨ 开始生成</button>
                <div id="my-module-result"></div>
            </main>
        `;
        // 绑定事件
        document.getElementById('my-module-generate-btn')
            .addEventListener('click', () => this.doAiTask());
    },

    // ─── AI 文字生成 ───
    async doAiTask() {
        if (this.generating) return;
        this.generating = true;
        const btn = document.getElementById('my-module-generate-btn');
        btn.disabled = true;
        btn.textContent = '⏳ 生成中...';

        try {
            const result = await Engine.services.aiChat({
                system: '你是一个创意角色生成器。',
                messages: [{ role: 'user', content: '生成一个有趣的角色' }],
                options: { temperature: 1.0, maxTokens: 500 },
            });

            document.getElementById('my-module-result').textContent = result;
        } catch (err) {
            console.error('[MyModule] AI 调用失败:', err);
            showToast('生成失败: ' + err.message);
        } finally {
            this.generating = false;
            btn.disabled = false;
            btn.textContent = '✨ 开始生成';
        }
    },

    // ─── AI 图片生成 ───
    async doImageTask() {
        try {
            const imageUrl = await Engine.services.aiGenerateImage(
                '二次元动漫风格，少女，粉色头发，微笑，精美画质'
            );
            // 使用图片
            document.getElementById('my-module-result').innerHTML =
                `<img src="${imageUrl}" style="max-width:100%;border-radius:12px;">`;
        } catch (err) {
            console.error('[MyModule] 生图失败:', err);
            showToast('生图失败: ' + err.message);
        }
    },

    // ─── 流式输出 ───
    async doStreamTask() {
        const resultDiv = document.getElementById('my-module-result');
        resultDiv.textContent = '';

        try {
            const fullText = await Engine.services.aiChat({
                system: '你是一个故事叙述者。',
                messages: [{ role: 'user', content: '讲一个短故事' }],
                options: { temperature: 0.9, maxTokens: 1000 },
                onToken: (delta) => {
                    resultDiv.textContent += delta;
                    resultDiv.scrollTop = resultDiv.scrollHeight;
                },
            });
            console.log('完整回复长度:', fullText.length);
        } catch (err) {
            showToast('生成失败: ' + err.message);
        }
    },
});
```

### Step 3：在 HTML 中注册

在 `章鱼喷墨机.html` 中添加：

```html
<!-- 1. 添加 screen（与其他 screen 并列） -->
<div id="my-module-screen" class="screen"></div>

<!-- 2. 加载模块脚本（在 engine/core.js 之后、app.js 之前） -->
<script src="modules/my-module/my-module.js"></script>

<!-- 3. 如果有样式，添加在 <head> 中 -->
<link rel="stylesheet" href="modules/my-module/my-module.css">
```

### Step 4：（可选）添加主页入口图标

在 `engine/ui.js` 的 `defaultIcons` 中注册：

```js
'my-module-screen': { name: '我的模块', url: 'assets/icons/my-module.png' },
```

---

## 4. AI 文字调用规范

### 标准调用

```js
const text = await Engine.services.aiChat({
    system: '系统提示词，定义 AI 的角色和行为',
    messages: [
        { role: 'user', content: '用户输入' }
    ],
    options: {
        temperature: 0.9,   // 0~2，越高越有创造性
        maxTokens: 500,     // 最大输出 token 数
    }
});
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `system` | string | 否 | 系统提示词 |
| `messages` | Array | 是 | `[{ role: 'user'|'assistant', content: string }]` |
| `options.temperature` | number | 否 | 默认 0.9 |
| `options.maxTokens` | number | 否 | 默认 2048 |
| `onToken` | function | 否 | 流式回调 `(delta: string) => void`，传此参数启用流式 |
| `signal` | AbortSignal | 否 | 中止信号 |

### temperature 参考值

| 场景 | 值 | 说明 |
|------|-----|------|
| 结构化提取（名字、字段） | 0.3 | 稳定、确定性高 |
| 记忆摘要 | 0.7 | 准确优先 |
| 角色扮演对话 | 0.9 | 需要个性和创造性 |
| 世界设定/角色生成 | 1.0 | 最大创造性 |
| 弹幕/评论生成 | 0.9~1.0 | 需要多样性 |

### 返回值

- 成功：返回 `string`（AI 回复文本）
- 失败：抛出 `AiServiceError`

```js
try {
    const text = await Engine.services.aiChat({...});
} catch (err) {
    if (err.name === 'AiServiceError') {
        console.error(err.code, err.message, err.status);
        // code: CONFIG_ERROR | API_ERROR | NETWORK_ERROR | PARSE_ERROR | ABORTED
    }
}
```

---

## 5. AI 图片生成规范

### 标准调用

```js
const imageUrl = await Engine.services.aiGenerateImage(prompt, options);
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `prompt` | string | 图片描述（越详细越好） |
| `options.imageSize` | string | 默认 `'768x1024'` |

### 返回值

- 成功：返回图片 URL（`http://...` 或 `data:image/png;base64,...`）
- 失败：抛出 `AiServiceError`

### Prompt 技巧

```
✅ 好：二次元动漫风格，卧室场景，少女坐在床上，粉色睡衣，害羞表情，精美画质，细节丰富
❌ 差：一个女孩
```

### 尺寸参考

| 场景 | 尺寸 |
|------|------|
| 头像 | `512x512` |
| 聊天配图 | `768x1024` |
| 直播画面 | `1024x768` |
| 全身立绘 | `512x1024` |

---

## 6. 流式输出规范

当需要实时显示 AI 生成过程时，传入 `onToken` 回调：

```js
const resultDiv = document.getElementById('output');

const fullText = await Engine.services.aiChat({
    system: '你是一个故事叙述者。',
    messages: [{ role: 'user', content: '讲一个故事' }],
    options: { temperature: 0.9 },
    onToken: (delta) => {
        // delta 是本次收到的增量文本
        resultDiv.textContent += delta;
        resultDiv.scrollTop = resultDiv.scrollHeight;
    },
});
// fullText 是完整回复（等于所有 delta 拼接）
```

### 流式注意事项

- `onToken` 会多次调用，每次传入一小段增量文本
- 最终返回值仍是完整的回复文本
- 可配合 `AbortSignal` 实现取消：
  ```js
  const controller = new AbortController();
  // 用户点击取消时：controller.abort()
  const text = await Engine.services.aiChat({ ..., signal: controller.signal });
  ```

---

## 7. 数据持久化规范

### 读写数据

```js
// 读取
const myData = db.myModuleData || {};

// 写入
db.myModuleData = { ...myData, newField: 'value' };
await saveData();  // 必须调用！
```

### 命名规范

```js
// ✅ 独立命名空间
db.myModuleResults = [];
db.myModuleSettings = {};

// ❌ 避免污染顶层
db.results = [];
```

### 常用数据

```js
const characters = db.characters || [];   // 私聊角色列表
const groups = db.groups || [];           // 群聊列表
const api = getActiveApi();               // { url, key, model, provider }
const imgSettings = db.imgGenSettings;    // { url, key, model }
```

---

## 8. UI 与交互规范

### Screen 结构

```html
<div id="my-module-screen" class="screen">
    <header class="app-header">
        <button class="back-btn" onclick="switchScreen('home-screen')">‹</button>
        <h1 class="title">🎯 我的模块</h1>
        <button class="action-btn" id="my-action-btn">+</button>
    </header>
    <main class="content" id="my-module-content">
        <!-- 动态内容 -->
    </main>
</div>
```

### 常用 UI 函数

```js
switchScreen('my-module-screen');    // 切换页面
showToast('操作成功！');               // 提示
btn.disabled = true;                 // 禁用按钮
btn.textContent = '⏳ 处理中...';    // 加载态
area.scrollTop = area.scrollHeight;  // 滚动到底
const img = await compressImage(file, 800, 0.8);  // 压缩图片
```

### 防重复点击

```js
async doTask() {
    if (this.generating) return;
    this.generating = true;
    try {
        // ... 异步操作 ...
    } finally {
        this.generating = false;  // 无论成功失败都恢复
    }
}
```

---

## 9. Checklist

### 结构
- [ ] 模块目录 `modules/my-module/` 已创建
- [ ] JS 文件包含 `Engine.register({ id, name, icon, screen, order })`
- [ ] `id` 唯一，不与已有模块冲突
- [ ] `screen` id 与 HTML 中的 div id 一致

### HTML 注册
- [ ] 添加了 `<div id="xxx-screen" class="screen"></div>`
- [ ] 添加了 `<script src="modules/xxx/xxx.js"></script>`
- [ ] script 在 `engine/core.js` 之后、`app.js` 之前

### AI 调用（核心）
- [ ] 文字生成使用 `Engine.services.aiChat()` — **无内联 fetch**
- [ ] 图片生成使用 `Engine.services.aiGenerateImage()` — **无内联 fetch**
- [ ] 已设置合理的 `temperature` 和 `maxTokens`
- [ ] 已 try/catch 处理 `AiServiceError`
- [ ] 已处理空返回值

### 数据
- [ ] 数据存储在 `db.xxx` 独立命名空间
- [ ] 修改后调用 `await saveData()`

### UI
- [ ] 包含标准 header（返回 + 标题）
- [ ] 加载态有 UI 反馈（disabled + loading 文案）
- [ ] 错误有 toast 提示

### 交互
- [ ] 防重复点击（`if (this.generating) return`）
- [ ] finally 恢复状态

---

## 附录：速查卡片

```
┌──────────────────────────────────────────────────┐
│  模块开发速查                                      │
├──────────────────────────────────────────────────┤
│  注册:    Engine.register({ id, name, icon })     │
│  切页:    switchScreen('xxx-screen')              │
│  AI文字:  Engine.services.aiChat(opts)            │
│  AI生图:  Engine.services.aiGenerateImage(prompt)  │
│  流式:    opts.onToken = (delta) => {...}          │
│  数据:    db.xxx / await saveData()               │
│  提示:    showToast('消息')                        │
│  加载态:  btn.disabled = true / false             │
│  获取模块: Engine.getModule('id')                  │
├──────────────────────────────────────────────────┤
│  AiService 错误码:                                │
│  CONFIG_ERROR  - 配置缺失（未设置 API）             │
│  API_ERROR     - API 返回错误（含 HTTP 状态码）     │
│  NETWORK_ERROR - 网络不通                          │
│  PARSE_ERROR   - 响应解析失败                      │
│  ABORTED       - 请求被取消                        │
└──────────────────────────────────────────────────┘
```
