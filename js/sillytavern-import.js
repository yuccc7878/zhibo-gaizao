/**
 * SillyTavern 角色卡导入模块
 * 支持 PNG（V2/V3）和 JSON 格式导入
 * 解析后输出归一化角色数据 + 内嵌世界书
 *
 * 全局暴露：SillyTavernImporter
 */

window.SillyTavernImporter = (() => {
  'use strict';

  // ─── PNG 块解析 ─────────────────────────────

  /** PNG 文件签名（8字节） */
  const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  /** 读取 ArrayBuffer 中指定偏移的 4 字节大端整数 */
  function readUint32(view, offset) {
    return view.getUint32(offset, false);
  }

  /** 将 ArrayBuffer 中的一段解码为 UTF-8 字符串 */
  function decodeText(buf, start, length) {
    const bytes = new Uint8Array(buf, start, length);
    // 处理 zTXt 可能包含的压缩标志
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  /**
   * 从 PNG 文件的 ArrayBuffer 中解析文本块
   * @param {ArrayBuffer} buffer
   * @returns {Object.<string, string>} 关键字 → 文本内容 映射
   */
  function parsePngTextChunks(buffer) {
    const view = new DataView(buffer);
    const len = buffer.byteLength;
    let pos = 8; // 跳过 PNG 签名

    const result = {};
    const foundChunks = [];

    while (pos + 8 < len) {
      const dataLen = readUint32(view, pos);
      pos += 4;
      const type = decodeText(buffer, pos, 4);
      pos += 4;

      foundChunks.push(type);

      if (dataLen > 0 && pos + dataLen <= len) {
        const rawData = new Uint8Array(buffer, pos, dataLen);

        if (type === 'tEXt') {
          // tEXt: keyword + null + text (Latin-1 编码，但部分卡片存的是 UTF-8)
          const nullIdx = rawData.indexOf(0);
          if (nullIdx >= 0) {
            const keyword = new TextDecoder('utf-8').decode(rawData.slice(0, nullIdx));
            // 尝试 UTF-8 解码（兼容原生 UTF-8 存储的卡片）
            // 如果失败则降级到 Latin-1(iso-8859-1) 解码
            var text = tryDecodeText(rawData.slice(nullIdx + 1));
            result[keyword] = text;
          }
        } else if (type === 'zTXt') {
          // zTXt: keyword + null + compression(0x00) + compressed text
          const nullIdx = rawData.indexOf(0);
          if (nullIdx >= 0 && nullIdx + 2 < rawData.length) {
            const keyword = new TextDecoder('utf-8').decode(rawData.slice(0, nullIdx));
            const compression = rawData[nullIdx + 1];
            if (compression === 0x00) {
              try {
                const compressed = rawData.slice(nullIdx + 2);
                const inflate = new Uint8Array(
                  pakoInflate(compressed)
                );
                result[keyword] = new TextDecoder('utf-8').decode(inflate);
              } catch (e) {
                console.warn('[STImport] zTXt 解压失败:', keyword, e);
              }
            }
          }
        } else if (type === 'iTXt') {
          // iTXt: keyword + null + compression(0/1) + compMethod(0) + lang + null + translated_keyword + null + text
          const null1 = rawData.indexOf(0);
          if (null1 >= 0) {
            const keyword = new TextDecoder('utf-8').decode(rawData.slice(0, null1));
            const compression = rawData[null1 + 1];
            const compMethod = rawData[null1 + 2];
            let off = null1 + 3;
            // 跳过语言标签
            while (off < rawData.length && rawData[off] !== 0) off++;
            off++; // 跳过 null
            // 跳过翻译关键字
            while (off < rawData.length && rawData[off] !== 0) off++;
            off++; // 跳过 null
            if (off < rawData.length) {
              let textBytes = rawData.slice(off);
              if (compression === 1 && compMethod === 0) {
                try {
                  textBytes = new Uint8Array(pakoInflate(textBytes));
                } catch (e) {
                  console.warn('[STImport] iTXt 解压失败:', keyword, e);
                  continue;
                }
              }
              result[keyword] = new TextDecoder('utf-8').decode(textBytes);
            }
          }
        }
      }

      pos += dataLen + 4; // skip CRC
    }

    console.log('[STImport] PNG chunks found:', foundChunks.join(', '), 'keys:', Object.keys(result));
    return result;
  }

  /**
   * 解码 tEXt 块文本：优先 UTF-8（兼容原生 UTF-8 卡片），
   * 失败后降级到 iso-8859-1（标准 Latin-1）。
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  function tryDecodeText(bytes) {
    // 先尝试 UTF-8（非严格模式）
    var utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    // 替换字符 U+FFFD 出现说明有非 UTF-8 字节 → 降级 Latin-1
    if (utf8.indexOf('�') >= 0) {
      return new TextDecoder('iso-8859-1').decode(bytes);
    }
    return utf8;
  }

  /** 简单的 pako inflate（需要加载 pako 库） */
  function pakoInflate(data) {
    if (typeof pako !== 'undefined') {
      return pako.inflate(data);
    }
    throw new Error('pako 未加载');
  }

  // ─── JSON 解析 ─────────────────────────────

  /**
   * 尝试解析 JSON 字符串（自动清除 BOM 和零宽字符）
   */
  function tryParseJSON(str) {
    if (!str) return null;
    try {
      // 清除 BOM、零宽字符、首尾空白
      var cleaned = str.replace(/^﻿/, '').replace(/[​-‍﻿]/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      // JSON 解析失败 -> 尝试 base64 解码（SillyTavern 部分卡片使用 base64）
      try {
        var raw = atob(str.replace(/\s/g, ''));
        // atob 返回 Latin-1 字符串，转为 bytes 再用 UTF-8 解码（修复中文乱码）
        var bytes = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        var utf8 = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(utf8);
      } catch (e2) { return null; }
    }
  }

  // ─── 卡片归一化 ─────────────────────────────

  /**
   * 归一化角色卡数据
   * @param {Object} obj - 解析后的原始 JSON
   * @returns {Object|null} NormalizedCard
   */
  function normalizeCard(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // V3 (ccv3) 格式
    if (obj.spec === 'chara_card_v3' && obj.data) {
      return normalizeV3(obj);
    }

    // V2 格式 (chara V2)
    if (obj.spec === 'chara_card_v2' || obj.chara_version === 2) {
      return normalizeV2(obj);
    }

    // V1 格式 (chara V1) — 直接是角色数据，或 data 字段
    const data = obj.data || obj;
    if (data.name || data.description || data.personality) {
      return normalizeV1(data);
    }

    // 尝试检测其他常见格式
    if (obj.name && (obj.personality || obj.description || obj.first_mes)) {
      return normalizeV1(obj);
    }

    return null;
  }

  function normalizeV3(obj) {
    const d = obj.data || {};
    const card = buildBaseCard(d);
    card.spec = 'chara_card_v3';
    card.system_prompt = d.system_prompt || '';
    card.post_history_instructions = d.post_history_instructions || '';
    card.creator_notes = d.creator_notes || '';
    card.creator = d.creator || '';
    card.tags = Array.isArray(d.tags) ? d.tags : [];
    card.character_book = d.character_book || null;
    card.alternate_greetings = Array.isArray(d.alternate_greetings) ? d.alternate_greetings : [];
    return card;
  }

  function normalizeV2(obj) {
    const d = obj.data || obj;
    const card = buildBaseCard(d);
    card.spec = 'chara_card_v2';
    card.system_prompt = d.system_prompt || d.creator_notes || '';
    card.post_history_instructions = d.post_history_instructions || '';
    card.character_book = d.character_book || null;
    return card;
  }

  function normalizeV1(obj) {
    const card = buildBaseCard(obj);
    card.spec = 'chara_card_v1';
    card.system_prompt = obj.system_prompt || '';
    card.character_book = obj.character_book || null;
    return card;
  }

  function buildBaseCard(d) {
    return {
      name: d.name || '',
      description: d.description || '',
      personality: d.personality || '',
      scenario: d.scenario || '',
      first_mes: d.first_mes || '',
      mes_example: d.mes_example || '',
      avatar: d.avatar || '',
    };
  }

  // ─── 世界书提取 ─────────────────────────────

  /**
   * 从角色卡中提取内嵌世界书
   * @param {Object|null} characterBook
   * @returns {Array.<{name:string, content:string, position:string}>}
   */
  function extractBuiltinWorldBook(characterBook) {
    if (!characterBook || typeof characterBook !== 'object') return [];

    const entries = [];
    const bookData = characterBook.data || characterBook.entries || [];

    if (!Array.isArray(bookData)) return [];

    bookData.forEach((entry, idx) => {
      if (entry === null || typeof entry !== 'object') return;
      // 只提取 enabled 的条目
      if (entry.disabled === true || entry.enabled === false) return;

      // 跳过 empty 的关键词
      const keys = Array.isArray(entry.keys) ? entry.keys.filter(k => k && k.trim()) : [];
      if (keys.length === 0 && !entry.content) return;

      const name = entry.name || entry.key || keys[0] || `条目 ${idx + 1}`;
      const content = entry.content || '';
      const position = entry.position || 'before';

      entries.push({
        name: name,
        content: content,
        keys: keys,
        position: position,
        // 保存原始 ID 供勾选引用
        _originIndex: idx,
        _enabled: entry.enabled !== false,
      });
    });

    return entries;
  }

  // ─── 主入口 ─────────────────────────────

  /**
   * 解析角色卡文件（PNG 或 JSON）
   * @param {File|Blob} file - 文件对象
   * @returns {Promise<NormalizedCard>}
   */
  async function parseCardFile(file) {
    const name = file.name || '';
    const ext = name.split('.').pop().toLowerCase();

    if (ext === 'png') {
      return parsePngCard(file);
    } else if (ext === 'json') {
      return parseJsonCard(file);
    } else {
      throw new Error('不支持的文件格式，请使用 .png 或 .json 角色卡');
    }
  }

  async function parsePngCard(file) {
    const buffer = await file.arrayBuffer();

    // 验证 PNG 签名
    const sig = new Uint8Array(buffer, 0, 8);
    for (let i = 0; i < 8; i++) {
      if (sig[i] !== PNG_SIGNATURE[i]) {
        throw new Error('不是有效的 PNG 文件（签名不匹配）');
      }
    }

    const chunks = parsePngTextChunks(buffer);
    var keys = Object.keys(chunks);
    if (keys.length === 0) {
      throw new Error('PNG 文件中未找到文本块，请确认是 SillyTavern 角色卡');
    }

    // 尝试 V3 (ccv3)
    var ccv3Raw = chunks['ccv3'];
    if (ccv3Raw) {
      var ccv3 = tryParseJSON(ccv3Raw);
      if (ccv3) {
        var card = normalizeCard(ccv3);
        if (card) {
          // 尝试从 chara 补充可能缺失的信息
          var charaRaw = chunks['chara'];
          if (charaRaw && !card.system_prompt) {
            var chara = tryParseJSON(charaRaw);
            if (chara) {
              var v2Card = normalizeCard(chara);
              if (v2Card && v2Card.system_prompt) {
                card.system_prompt = card.system_prompt || v2Card.system_prompt;
              }
            }
          }
          return card;
        }
        console.warn('[STImport] ccv3 数据格式无法识别，尝试 chara');
      } else {
        console.warn('[STImport] ccv3 JSON 解析失败，尝试 chara');
      }
    }

    // 尝试 chara (V1/V2)
    var charaRaw = chunks['chara'];
    if (charaRaw) {
      var chara = tryParseJSON(charaRaw);
      if (chara) {
        var card = normalizeCard(chara);
        if (card) return card;
        console.warn('[STImport] chara 数据格式无法识别');
      } else {
        console.warn('[STImport] chara JSON 解析失败');
        // 输出原始文本前 200 字符帮助调试
        console.warn('[STImport] chara 原文:', charaRaw.substring(0, 200));
      }
    }

    throw new Error('PNG 中未找到角色卡数据（已有块: ' + keys.join(', ') + '），不包含 chara 或 ccv3');
  }

  async function parseJsonCard(file) {
    const text = await file.text();
    const obj = tryParseJSON(text);
    if (!obj) throw new Error('JSON 文件格式错误，无法解析');

    const card = normalizeCard(obj);
    if (card) return card;

    throw new Error('JSON 数据无法识别为角色卡（未匹配 V1/V2/V3 格式）');
  }

  // ─── 导入到应用数据 ─────────────────────────────

  /**
   * 将归一化角色卡保存到 db
   * @param {NormalizedCard} card - 归一化角色卡
   * @param {Object} selections - 勾选项
   * @param {boolean} selections.includeScenario
   * @param {boolean} selections.includeExamples
   * @param {boolean} selections.includeSystemPrompt
   * @param {Array.<number>} selections.selectedWorldBookIndices - 选中的世界书条目原始索引
   * @returns {Object} { characterId, worldBookIds }
   */
  function saveImportedCard(card, selections) {
    const { includeScenario, includeExamples, includeSystemPrompt, selectedWorldBookIndices } = selections;

    // 构建人设文本
    let persona = card.description || '';
    if (card.personality) {
      persona = persona ? persona + '\n\n' + card.personality : card.personality;
    }

    // 构建场景文本
    let scenario = '';
    if (includeScenario && card.scenario) {
      scenario = card.scenario;
    }

    // 构建系统指令
    let systemPrompt = '';
    if (includeSystemPrompt && card.system_prompt) {
      systemPrompt = card.system_prompt;
    }

    // 构建对话示例
    let mesExample = '';
    if (includeExamples && card.mes_example) {
      mesExample = card.mes_example;
    }

    // 处理内嵌世界书
    const builtinWorldBooks = extractBuiltinWorldBook(card.character_book);
    const selectedBooks = [];
    if (selectedWorldBookIndices && selectedWorldBookIndices.length > 0) {
      builtinWorldBooks.forEach((wb, idx) => {
        if (selectedWorldBookIndices.includes(idx)) {
          const newWb = {
            id: `wb_${Date.now()}_${idx}`,
            name: wb.name,
            content: wb.content,
            position: wb.position || 'before',
            keys: wb.keys || [],
            enabled: true,
            isBuiltin: true, // 标记为内嵌世界书
          };
          selectedBooks.push(newWb);
        }
      });
    }

    // 创建角色
    const newChar = {
      id: `char_${Date.now()}`,
      realName: card.name || '未命名',
      remarkName: card.name || '未命名',
      persona: persona,
      scenario: scenario,
      systemPrompt: systemPrompt,
      mesExample: mesExample,
      builtinWorldBooks: selectedBooks, // 专属世界书
      avatar: card.avatar || 'assets/icons/default-avatar.png',
      myName: '我',
      myPersona: '',
      myAvatar: 'assets/icons/default-avatar.png',
      theme: 'white_pink',
      maxMemory: 100,
      chatBg: '',
      history: [],
      isPinned: false,
      status: '在线',
      worldBookIds: [],
      useCustomBubbleCss: false,
      customBubbleCss: '',
      aiImgGen: false,
      // 记忆相关
      memorySummary: '',
      keyEvents: [],
      summaryIndex: 0,
    };

    if (typeof db === 'undefined') throw new Error('全局 db 未就绪');
    if (!db.characters) db.characters = []; db.characters.push(newChar);

    // 将专属世界书也加到全局世界书列表？不，用 isBuiltin 标记区分
    // 专属世界书存在角色对象的 builtinWorldBooks 字段中

    return {
      characterId: newChar.id,
      builtinWorldBookIds: selectedBooks.map(b => b.id),
    };
  }

  // ─── 公开 API ─────────────────────────────

  return {
    parseCardFile,
    normalizeCard,
    extractBuiltinWorldBook,
    saveImportedCard,
    // 供预览使用
    parsePngTextChunks,
  };
})();
