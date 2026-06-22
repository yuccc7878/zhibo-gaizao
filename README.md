# 组装姬

> 基于「章鱼喷墨机」的完全重制版，模块化架构，功能全面扩展。

## 简介

**组装姬** 是对原版 [章鱼喷墨机](https://github.com/yuccc7878/zhibo-gaizao) 聊天应用的深度重制。保留了原版核心的 AI 角色聊天体验，同时将单文件架构重构为模块化引擎系统，新增直播、商店、抽卡、换装等多个功能模块。

### 与原版的关系

| | 原版「章鱼喷墨机」 | 重制版「组装姬」 |
|---|---|---|
| 架构 | 单 HTML 文件（~5000 行） | 模块化引擎 + 独立功能模块 |
| AI 调用 | 各处直接 fetch | AiService 统一服务层 |
| 功能模块 | 聊天 + 基础设置 | +直播/商店/抽卡/相册/换装/游戏/媒体 |
| 核心函数 | 76 个 | 保留 74 个 + 新增 84 个 |
| 总代码量 | ~5000 行 | ~12000 行 |

核心聊天逻辑（消息收发、气泡渲染、记忆系统、世界书、群聊等）**完全保留**，在此基础上扩展了模块化引擎和多个独立功能模块。

### 功能一览

**核心功能（继承自原版）**
- 💬 私聊 / 群聊，AI 角色扮演
- 🎭 表情包、语音、照片/视频、转账、礼物
- 📝 对话摘要 + 关键事件记忆系统
- 📖 世界书（全局 + 角色专属）
- 🎨 自定义气泡样式、主题颜色、字体
- 🖼️ AI 自主配图

**新增功能模块**

| 模块 | 图标 | 说明 |
|------|------|------|
| 直播 | 📺 | AI 剧情生成 + 弹幕互动，打赏系统，场景/等级/道具选择，AI 生图背景 |
| 商店 | 🛒 | 日常消费 + 限定套装，购买后可赠送，道具用于直播消耗 |
| 抽卡 | 🎲 | AI 角色生成，许愿系统，批量抽卡，加为好友 |
| 媒体 | 📰 | B站/头条/OnlyFans 三频道，AI 生成内容列表，流式详情页，分享到聊天 |
| 相册 | 📷 | 图片导入，封面设置 |
| 换装 | 👗 | 拖拽换装，15 种肤色，121 件内置服装，自定义导入，PNG 导出 |
| 游戏 | 🎮 | 2048/贪吃蛇/像素鸟/老虎机，金币奖励 |
| 激活世界 | 🌐 | AI 主动推进剧情，定时触发，支持私聊/群聊/双模式 |

## 项目结构

```
zhibo-gaizao/
├── 组装姬.html              # 主入口
├── app.js                    # 聊天室核心逻辑（单文件兼容版）
│
├── js/
│   ├── core/
│   │   ├── aiService.js      # AiService 统一 AI 通信层
│   │   ├── dataService.js    # 数据服务
│   │   ├── dom.js            # DOM 缓存
│   │   └── utils.js          # 工具函数与常量
│   ├── ui/
│   │   ├── chatRoom.js       # 聊天室
│   │   ├── chatList.js       # 聊天列表
│   │   ├── homeScreen.js     # 主屏幕
│   │   ├── settings.js       # 聊天设置
│   │   ├── customize.js      # 自定义 + 数据备份/导入
│   │   ├── wallpaper.js      # 壁纸
│   │   └── fontSettings.js   # 字体
│   └── systems/
│       ├── worldBook.js      # 世界书
│       ├── apiSettings.js    # API 设置
│       ├── group.js          # 群聊系统
│       ├── wallet.js         # 钱包/转账
│       ├── gift.js           # 礼物
│       ├── stickers.js       # 表情包
│       ├── voice.js          # 语音
│       ├── photoVideo.js     # 照片/视频
│       ├── imageRecognition.js # 图片识别
│       └── timeSkip.js       # 时间跳跃
│
├── engine/                   # 引擎核心层
│   ├── core.js               # Engine 模块注册 + AI 服务桥接
│   ├── db.js                 # 数据持久化（Dexie/IndexedDB）
│   ├── ui.js                 # UI 工具函数
│   └── styles.css            # 全局样式
│
├── modules/                  # 功能模块
│   ├── live/                 # 直播
│   ├── shop/                 # 商店
│   ├── gacha/                # 抽卡
│   ├── media/                # 媒体
│   ├── album/                # 相册
│   ├── wardrobe/             # 换装
│   ├── games/                # 游戏
│   └── bilibili/             # B站数据
│
├── assets/
│   ├── icons/nav/            # 侧边栏图标（本地）
│   ├── stickers/             # 内置表情包
│   └── wallpaper.jpg         # 默认壁纸
│
├── SKILL-MODULE-DEV.md       # 模块开发标准作业流程
├── CHANGELOG.md
└── README.md
```

## AI 服务架构

所有 AI 调用统一通过 `AiService` 适配层，模块无需关心底层 Provider 差异。

### 支持的 Provider

| Provider | 说明 |
|----------|------|
| `newapi` | 自定义 OpenAI 兼容 API |
| `deepseek` | DeepSeek |
| `claude` | Anthropic Claude |
| `gemini` | Google Gemini |

### 调用方式

```js
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

## Engine API

```js
// 模块注册
Engine.register({ id, name, icon, screen, order, init(), open() })
Engine.getModule(id)
Engine.getAllModules()

// AI 服务
Engine.services.aiChat({ system, messages, options, onToken })
Engine.services.aiGenerateImage(prompt, options)

// 数据 & UI
Engine.services.db
Engine.services.saveData()
Engine.services.switchScreen()
Engine.services.showToast()
```

## 自定义模块开发

详见 [SKILL-MODULE-DEV.md](./SKILL-MODULE-DEV.md)。

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
        });
    },
});
```

## 依赖

- [Dexie.js](https://dexie.org/) - IndexedDB 封装（CDN）
- 需要配置 AI API（支持 DeepSeek / Claude / Gemini / NewAPI）

## 致谢

原版项目：[章鱼喷墨机](https://github.com/yuccc7878/zhibo-gaizao) — 本项目在其基础上进行了模块化重构与功能扩展。
