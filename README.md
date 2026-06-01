# 章鱼喷墨机 - 直播改造版

基于原版「章鱼喷墨机」聊天应用的**模块化引擎改造**。

## 🏗️ 项目结构

```
zhibo-gaizao/
├── 章鱼喷墨机.html          # 主入口（HTML Shell）
├── index.html              # 跳转页
├── app.js                  # 主应用逻辑（聊天、设置、世界书等）
│
├── engine/                 # 🔧 引擎核心层
│   ├── styles.css          # 共享样式
│   ├── db.js               # 数据持久化（Dexie/IndexedDB）
│   ├── core.js             # Engine 模块注册/调度
│   └── ui.js               # UI 工具函数（switchScreen, showToast 等）
│
├── modules/                # 📦 功能模块（每个模块独立目录）
│   ├── shop/
│   │   ├── shop.css        # 商店样式
│   │   └── shop.js         # 商店逻辑
│   ├── live/
│   │   ├── live.css        # 直播样式
│   │   └── live.js         # 直播逻辑
│   ├── bilibili/
│   │   ├── bilibili.css    # B站样式
│   │   └── bilibili.js     # B站逻辑
│   ├── games/
│   │   ├── games.css       # 游戏中心样式
│   │   └── games.js        # 游戏中心逻辑
│   ├── album/
│   │   ├── album.css       # 相册样式
│   │   └── album.js        # 相册逻辑
│   └── gacha/
│       ├── gacha.css       # 摇一摇样式
│       └── gacha.js        # 摇一摇逻辑
│   └── wardrobe/
│       ├── wardrobe.css    # 衣帽间样式
│       ├── wardrobe.js     # 衣帽间逻辑
│       ├── base/           # 肤色资源
│       └── images/         # 服装资源（上衣/下装/全身）
│
├── README.md
└── CHANGELOG.md
```

## 📦 当前模块

| 模块 | 图标 | 说明 |
|------|------|------|
| shop | 🛒 | 商店（日常消费 + R18，含限定套装，购买后可赠送） |
| live | 📺 | 直播（三步开播，AI 剧情+弹幕，金币收益，二次元生图，道具消耗） |
| bilibili | 📱 | B站热门视频 |
| games | 🎮 | 游戏中心（2048/贪吃蛇/像素鸟/老虎机，触控+键盘，金币奖励） |
| album | 📷 | 相册（导入图片，设封面，主页大图标） |
| gacha | 🎲 | 摇一摇（AI 角色生成，许愿系统，批量生成，加为好友） |
| wardrobe | 👗 | 衣帽间（拖拽换装，15种肤色，114件内置服装，自定义导入，PNG导出） |

## 👗 衣帽间模块

独立换装系统，支持纯静态运行（无需后端）。

### 功能特性

- **拖拽换装**：触摸/鼠标拖拽衣物到人偶身上，支持叠加穿戴
- **点击切换**：短按衣物穿脱切换，操作简便
- **肤色选择**：15种肤色（含幻想色系），点击缩略图即时切换
- **内置服装**：114件，9种颜色
  - 上衣（45件）：文胸、T恤、背心、短上衣、长袖、连帽衫
  - 下装（36件）：内裤、裙子、短裤、长裤、铅笔裙
  - 全身（33件）：连衣裙、夹克、大衣、和服
- **自定义导入**：📥 上传 PNG/JPG/WebP 图片，选择分类后自动存入 IndexedDB，刷新不丢失
- **导出图片**：💾 一键下载人偶为透明背景 PNG（html2canvas）
- **响应式布局**：适配手机和桌面浏览器

### 自定义导入

1. 点击右上角 📥 按钮
2. 选择图片（支持多选）
3. 选择分类（上衣/下装/全身）
4. 可选填服装名称
5. 点击「添加」，图片存入 IndexedDB
6. 右键自定义衣物可删除

### 技术实现

- 纯 JS 拖拽（无 jQuery 依赖），触摸 + 鼠标双支持
- Dexie.js 操作 IndexedDB 持久化自定义衣物
- html2canvas 截图导出
- 像素画风格，`image-rendering: pixelated`

## 🚀 新增模块指南

只需 **3 步**：

### 1. 创建模块目录

```bash
mkdir modules/mymodule
```

### 2. 编写模块文件

**`modules/mymodule/mymodule.css`**（可选）：
```css
/* 你的模块样式 */
```

**`modules/mymodule/mymodule.js`**：
```javascript
Engine.register({
    id: 'mymod',
    name: '我的功能',
    icon: '🎯',
    screen: 'mymod-screen',   // 对应 HTML 中的 <div id="mymod-screen">
    order: 4,                  // 排序权重

    init() {
        // 初始化：注入 HTML 到 screen 元素
        const screen = document.getElementById(this.screen);
        screen.innerHTML = `<header class="app-header">...</header><main>...</main>`;
    },

    open() {
        // 打开模块
        switchScreen(this.screen);
        // ...你的逻辑
    }
});
```

### 3. 注册到 HTML Shell

在 `章鱼喷墨机.html` 中添加：

```html
<!-- CSS -->
<link rel="stylesheet" href="modules/mymodule/mymodule.css">

<!-- 占位 screen -->
<div id="mymod-screen" class="screen"></div>

<!-- JS（在 engine/core.js 之后，app.js 之前） -->
<script src="modules/mymodule/mymodule.js"></script>
```

✅ 完成！模块会自动出现在主页右侧面板的「模块中心」。

## 📦 依赖

- [Dexie.js](https://dexie.org/) - IndexedDB 封装（CDN 引入）
- 需要配置 AI API（支持 DeepSeek / Claude / Gemini / NewAPI）

## 🔑 API 配置

支持**多个 API 配置预设**，可在设置页面切换：

- **聊天 API**：用于聊天回复、直播剧情生成、摇一摇角色生成
- **生图 API**（独立配置）：用于直播画面生成，支持 OpenAI 兼容格式（SiliconFlow、DALL·E 等）

聊天 API 每个配置包含：服务商、API 地址、密钥、模型。
生图 API 独立于聊天配置，可使用不同的服务商。

## 🔧 Engine API

```javascript
Engine.register(module)      // 注册模块
Engine.getModule(id)         // 获取模块实例
Engine.getAllModules()        // 获取所有模块
Engine.initAll()             // 初始化所有模块
Engine.openModule(id)        // 打开指定模块

// 共享服务（模块内通过 Engine.services 访问）
Engine.services.db           // 数据库对象
Engine.services.saveData()   // 保存数据
Engine.services.switchScreen() // 切换屏幕
Engine.services.showToast()  // 提示消息
```

## 💬 QQ 聊天模块

内置在主页的聊天功能，支持：

- **私聊**：与 AI 角色一对一对话
- **群聊**：多个 AI 角色同时互动
- **AI 回复**：支持 Gemini / DeepSeek / Claude / NewAPI
- **特殊消息**：表情包、语音、照片/视频、转账、礼物
- **赠送礼物**：从商店已购买物品中选择赠送，赠送后物品从库存扣除
- **钱包联动**：转账消耗/获得金币，余额实时显示
- **记忆系统**：对话记忆摘要 + 关键事件标记，角色拥有长期记忆
- **世界书**：为角色绑定世界观设定
- **自定义气泡**：CSS 自定义聊天气泡样式

## 🔄 检查更新

「主屏幕自定义」页面底部提供「检查更新」按钮，点击清除浏览器缓存并从 GitHub 重新加载最新版本。用户数据（聊天记录、API 配置等）保存在 IndexedDB 中不受影响。
