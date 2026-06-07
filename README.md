# 组装姬 - 直播改造版

基于原版「组装姬」聊天应用的**模块化引擎改造**，所有 AI 调用统一走 `AiService` 服务层。

## 🏗️ 项目结构

```
zhibo-gaizao/
├── 组装姬.html          # 主入口
├── app.js                  # 聊天室核心逻辑
│
├── js/core/
│   └── aiService.js        # ★ AiService 统一 AI 通信层（全局）
│
├── engine/                 # 引擎核心层
│   ├── db.js               # 数据持久化（Dexie/IndexedDB）
│   ├── core.js             # Engine 模块注册 + AI 服务桥接
│   └── ui.js               # UI 工具函数
│
├── modules/                # 功能模块
│   ├── shop/               # 商店
│   ├── live/               # 直播
│   ├── media/              # 媒体（B站/头条/OnlyFans）
│   ├── gacha/              # 摇一摇
│   ├── games/              # 游戏中心
│   ├── album/              # 相册
│   ├── wardrobe/           # 衣帽间
│   └── bilibili/           # B站数据
│
├── SKILL-MODULE-DEV.md     # 模块开发标准作业流程
├── CHANGELOG.md
└── README.md
```

## 📦 模块一览

| 模块 | 图标 | 说明 |
|------|------|------|
| shop | 🛒 | 商店（日常消费 + R18，含限定套装，购买后可赠送） |
| live | 📺 | 直播（AI 剧情 + 弹幕，打赏系统，二次元生图，道具消耗） |
| media | 📰 | 媒体（三Tab AI 生成内容，详情页流式文字 + AI 配图，分享到 QQ） |
| gacha | 🎲 | 摇一摇（AI 角色生成，许愿系统，批量生成，加为好友） |
| games | 🎮 | 游戏中心（2048/贪吃蛇/像素鸟/老虎机，金币奖励） |
| album | 📷 | 相册（导入图片，设封面） |
| wardrobe | 👗 | 衣帽间（拖拽换装，15 种肤色，121 件内置服装，自定义导入，PNG 导出） |

## 🔑 AI 服务架构

所有 AI 调用统一通过 `AiService` 适配层，模块无需关心底层 Provider 差异。

### 支持的 Provider

| Provider | 说明 |
|----------|------|
| `newapi` | 自定义 OpenAI 兼容 API |
| `deepseek` | DeepSeek |
| `claude` | Anthropic Claude |
| `gemini` | Google Gemini |

### 调用方式

模块中通过 `Engine.services` 统一调用：

```js
// 文字生成（非流式）
const text = await Engine.services.aiChat({
    system: '系统提示词',
    messages: [{ role: 'user', content: '用户输入' }],
    options: { temperature: 0.9, maxTokens: 500 },
});

// 文字生成（流式）
const text = await Engine.services.aiChat({
    system: '系统提示词',
    messages: [{ role: 'user', content: '用户输入' }],
    onToken: (delta) => { element.textContent += delta; },
});

// 图片生成
const imageUrl = await Engine.services.aiGenerateImage('图片描述');
```

### 架构层次

```
模块代码
  ↓ Engine.services.aiChat() / aiGenerateImage()
Engine.services（自动同步 db 配置）
  ↓ AiService.chat() / generateImage()
AiService（适配器模式：OpenAI / Gemini）
  ↓ fetch()
外部 API
```

## 🔧 Engine API

```js
// 模块注册
Engine.register({ id, name, icon, screen, order, init(), open() })
Engine.getModule(id)
Engine.getAllModules()

// AI 服务（自动从 db 读取 API 配置）
Engine.services.aiChat({ system, messages, options, onToken })
Engine.services.aiGenerateImage(prompt, options)
Engine.services.aiFetchModels(url, key, provider)

// 数据 & UI
Engine.services.db
Engine.services.saveData()
Engine.services.switchScreen()
Engine.services.showToast()
```

## 🚀 新增模块

详见 [SKILL-MODULE-DEV.md](./SKILL-MODULE-DEV.md)。

快速开始：

```bash
mkdir modules/my-module
```

```js
// modules/my-module/my-module.js
Engine.register({
    id: 'my-module',
    name: '我的模块',
    icon: '🎯',
    screen: 'my-module-screen',
    order: 10,

    async doAiTask() {
        const result = await Engine.services.aiChat({
            system: '你是一个...',
            messages: [{ role: 'user', content: '...' }],
            options: { temperature: 0.9 },
        });
    },
});
```

```html
<!-- 组装姬.html -->
<div id="my-module-screen" class="screen"></div>
<script src="modules/my-module/my-module.js"></script>
```

## 📦 依赖

- [Dexie.js](https://dexie.org/) - IndexedDB 封装（CDN）
- 需要配置 AI API（支持 DeepSeek / Claude / Gemini / NewAPI）

## 📰 媒体模块

AI 驱动的媒体内容浏览模块：

- **三 Tab 频道**：B 站 / 今日头条 / OnlyFans，独立提示词
- **AI 生成列表**：调用 `Engine.services.aiChat()` 生成 6 条模拟数据
- **详情页流式输出**：`onToken` 回调逐字显示 + 光标动画
- **后台 AI 配图**：并行调用 `Engine.services.aiGenerateImage()`
- **分享到 QQ**：读取联系人列表，一键分享到聊天

## 👗 衣帽间模块

独立换装系统，纯静态运行：

- 拖拽换装（触摸 + 鼠标双支持）
- 15 种肤色，121 件内置服装（发型/上衣/下装/全身）
- 自定义导入（PNG/JPG/WebP → IndexedDB 持久化）
- PNG 导出（html2canvas）

## 💬 QQ 聊天模块

- 私聊 / 群聊，AI 角色扮演
- 特殊消息：表情包、语音、照片/视频、转账、礼物
- 记忆系统：对话摘要 + 关键事件
- AI 自主配图：`[生成配图：描述]` 标记自动触发生图
- 世界书：绑定世界观设定
