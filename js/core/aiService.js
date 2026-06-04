/* ========================================
 * AiService - AI 通信层（全局版本）
 * 与 UI 完全解耦，支持多 provider 适配
 * 通过 window.AiService 暴露给所有模块
 * ======================================== */

(function () {
  'use strict';

  // ─── 错误类 ──────────────────────────

  class AiServiceError extends Error {
    /**
     * @param {'CONFIG_ERROR'|'API_ERROR'|'NETWORK_ERROR'|'PARSE_ERROR'|'ABORTED'} code
     * @param {string} message
     * @param {number|null} status HTTP 状态码
     */
    constructor(code, message, status = null) {
      super(message);
      this.name = 'AiServiceError';
      this.code = code;
      this.status = status;
    }
  }

  // ─── 配置管理 ─────────────────────────

  let chatConfig = null;   // { provider, url, key, model }
  let imageConfig = null;  // { url, key, model }

  function setChatConfig(config) {
    chatConfig = config ? { ...config } : null;
  }

  function setImageConfig(config) {
    imageConfig = config ? { ...config } : null;
  }

  function getChatConfig() {
    return chatConfig;
  }

  function getImageConfig() {
    return imageConfig;
  }

  // ─── 消息规范化 ───────────────────────

  function normalizeMessages(messages) {
    return messages.map(msg => {
      if (!msg) return { role: 'user', content: '', parts: [] };
      const normalized = { role: msg.role || 'user', content: msg.content || '' };
      if (msg.parts && msg.parts.length > 0) {
        normalized.parts = msg.parts;
      }
      return normalized;
    });
  }

  // ─── 适配器 ────────────────────────────

  class BaseAdapter {
    constructor(baseUrl, key, model) {
      this.baseUrl = baseUrl.replace(/\/+$/, '');
      this.key = key;
      this.model = model;
    }
    formatChatRequest(system, messages, options) {
      throw new AiServiceError('CONFIG_ERROR', '未实现的适配器');
    }
    parseResponse(json) {
      throw new AiServiceError('CONFIG_ERROR', '未实现的适配器');
    }
    parseStreamChunk(chunk) {
      throw new AiServiceError('CONFIG_ERROR', '未实现的适配器');
    }
  }

  // ─── OpenAI 适配器 ──────────────────────

  class OpenAIAdapter extends BaseAdapter {
    formatChatRequest(system, messages, options) {
      const msgs = normalizeMessages(messages).map(m => ({
        role: m.role,
        content: this._buildContent(m),
      }));
      if (system) {
        msgs.unshift({ role: 'system', content: system });
      }
      const body = {
        model: this.model,
        messages: msgs,
        temperature: options.temperature ?? 0.9,
        max_tokens: options.maxTokens ?? 2048,
        stream: options.stream ?? false,
      };
      return {
        url: this.baseUrl + '/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.key,
        },
        body: JSON.stringify(body),
      };
    }

    _buildContent(msg) {
      if (msg.parts && msg.parts.length > 0) {
        const parts = [];
        for (const p of msg.parts) {
          if (p.type === 'text' || p.type === 'html') {
            parts.push({ type: 'text', text: p.text });
          } else if (p.type === 'image') {
            parts.push({ type: 'image_url', image_url: { url: p.data } });
          }
        }
        return parts.length > 0 ? parts : msg.content;
      }
      return msg.content;
    }

    parseResponse(json) {
      if (!json.choices || !json.choices[0]) {
        throw new AiServiceError('PARSE_ERROR', 'AI 返回内容为空');
      }
      return json.choices[0].message?.content || '';
    }

    parseStreamChunk(chunk) {
      if (chunk.startsWith('data: ')) {
        const data = chunk.substring(6).trim();
        if (data === '[DONE]') return null;
        try {
          const json = JSON.parse(data);
          return json.choices?.[0]?.delta?.content || '';
        } catch { return ''; }
      }
      return '';
    }
  }

  // ─── Gemini 适配器 ─────────────────────

  class GeminiAdapter extends BaseAdapter {
    formatChatRequest(system, messages, options) {
      const contents = normalizeMessages(messages).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: this._buildParts(m),
      }));
      const body = {
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.9,
          maxOutputTokens: options.maxTokens ?? 2048,
        },
      };
      if (system) {
        body.system_instruction = { parts: [{ text: system }] };
      }
      const stream = options.stream ?? false;
      const endpoint = stream
        ? this.baseUrl + '/v1beta/models/' + this.model + ':streamGenerateContent?alt=sse&key=' + this.key
        : this.baseUrl + '/v1beta/models/' + this.model + ':generateContent?key=' + this.key;
      return {
        url: endpoint,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      };
    }

    _buildParts(msg) {
      if (msg.parts && msg.parts.length > 0) {
        return msg.parts.map(p => {
          if (p.type === 'text' || p.type === 'html') return { text: p.text };
          if (p.type === 'image') {
            const m = p.data.match(/^data:(image\/(.+));base64,(.*)$/);
            if (m) return { inline_data: { mime_type: m[1], data: m[3] } };
          }
          return null;
        }).filter(Boolean);
      }
      return [{ text: msg.content || '' }];
    }

    parseResponse(json) {
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text === undefined || text === null) {
        throw new AiServiceError('PARSE_ERROR', 'Gemini 返回内容为空');
      }
      return text;
    }

    parseStreamChunk(chunk) {
      if (!chunk.startsWith('data: ')) return '';
      const data = chunk.substring(6).trim();
      if (data === '[DONE]') return null;
      try {
        const json = JSON.parse(data);
        return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch { return ''; }
    }
  }

  // ─── 适配器工厂 ────────────────────────

  const adapterMap = {
    newapi: OpenAIAdapter,
    deepseek: OpenAIAdapter,
    claude: OpenAIAdapter,
    gemini: GeminiAdapter,
  };

  function createAdapter(config) {
    if (!config || !config.url || !config.key || !config.model) {
      throw new AiServiceError('CONFIG_ERROR', 'API 配置不完整，请检查接口地址、密钥和模型');
    }
    const AdapterClass = adapterMap[config.provider] || OpenAIAdapter;
    return new AdapterClass(config.url, config.key, config.model);
  }

  // ─── 核心方法 ──────────────────────────

  /**
   * AI 对话
   * @param {Object} opts
   * @param {string} opts.system 系统提示词
   * @param {Array} opts.messages 历史消息
   * @param {Object} [opts.options] 可选参数 { temperature, maxTokens }
   * @param {function(string): void} [opts.onToken] 流式回调，传此参数启用流式
   * @param {AbortSignal} [opts.signal] 中止信号
   * @returns {Promise<string>} 完整回复文本
   */
  async function chat({ system, messages, options = {}, onToken, signal }) {
    if (!chatConfig) {
      throw new AiServiceError('CONFIG_ERROR', '请先通过 setChatConfig 配置 AI 接口');
    }

    const adapter = createAdapter(chatConfig);
    const request = adapter.formatChatRequest(system, messages, {
      ...options,
      stream: !!onToken,
    });

    let response;
    try {
      response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AiServiceError('ABORTED', '请求已取消');
      }
      throw new AiServiceError('NETWORK_ERROR', '网络请求失败: ' + err.message);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new AiServiceError('API_ERROR', 'API Error: ' + response.status + ' ' + text, response.status);
    }

    if (onToken) {
      return streamResponse(response, adapter, onToken, signal);
    } else {
      const json = await response.json();
      return adapter.parseResponse(json);
    }
  }

  /**
   * 流式读取
   */
  async function streamResponse(response, adapter, onToken, signal) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const chunk = adapter.parseStreamChunk(line);
          if (chunk === null) break;
          if (chunk) {
            fullResponse += chunk;
            onToken(chunk);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AiServiceError('ABORTED', '流式请求已取消');
      }
      throw new AiServiceError('NETWORK_ERROR', '流式读取失败: ' + err.message);
    }

    if (buffer.trim()) {
      const chunk = adapter.parseStreamChunk(buffer.trim());
      if (chunk && chunk !== null) {
        fullResponse += chunk;
        onToken(chunk);
      }
    }

    return fullResponse;
  }

  // ─── 图片生成 ──────────────────────────

  /**
   * 生成图片
   * @param {string} prompt 描述文字
   * @param {Object} [options] 可选参数 { imageSize }
   * @returns {Promise<string>} 图片 URL
   */
  async function generateImage(prompt, options = {}) {
    const cfg = imageConfig || {};
    const imgUrl = cfg.url || 'https://image.pollinations.ai/prompt/';
    const imgKey = cfg.key || '';
    const imgModel = cfg.model || 'black-forest-labs/FLUX.1-schnell';

    let imageUrl = '';

    if (imgUrl.includes('pollinations')) {
      const encoded = encodeURIComponent(prompt + ', anime style, high quality');
      imageUrl = imgUrl.replace(/\/+$/, '') + '/' + encoded + '?width=768&height=1024&nologo=true';
      try {
        const resp = await fetch(imageUrl, { method: 'GET', signal: AbortSignal.timeout(30000) });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          let msg = '生图失败 (' + resp.status + ')';
          try { const j = JSON.parse(text); if (j.error) msg += ': ' + j.error; } catch (_) {}
          throw new AiServiceError('API_ERROR', msg, resp.status);
        }
        const ct = resp.headers.get('content-type') || '';
        if (!ct.includes('image/')) throw new AiServiceError('API_ERROR', '接口未返回图片 (content-type: ' + ct + ')');
      } catch (err) {
        if (err instanceof AiServiceError) throw err;
      }
      return imageUrl;
    }

    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + imgKey };
    const resp = await fetch(imgUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: imgModel,
        prompt: prompt,
        image_size: options.imageSize || '768x1024',
        batch_size: 1,
      }),
    });

    if (!resp.ok) {
      throw new AiServiceError('API_ERROR', '生图失败: ' + resp.status, resp.status);
    }

    const json = await resp.json();
    if (json.data && json.data[0]) {
      imageUrl = json.data[0].url || json.data[0].b64_json || '';
      if (json.data[0].b64_json && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        imageUrl = 'data:image/png;base64,' + imageUrl;
      }
    }
    if (!imageUrl) {
      throw new AiServiceError('PARSE_ERROR', '生图接口未返回图片地址');
    }
    return imageUrl;
  }

  // ─── 模型列表拉取 ──────────────────────

  /**
   * 拉取模型列表
   * @param {string} url API 地址
   * @param {string} key 密钥
   * @param {string} provider 服务商
   * @returns {Promise<string[]>}
   */
  async function fetchModels(url, key, provider) {
    if (provider === 'gemini') {
      const endpoint = url.replace(/\/+$/, '') + '/v1beta/models?key=' + key;
      const resp = await fetch(endpoint, { method: 'GET' });
      if (!resp.ok) throw new AiServiceError('API_ERROR', '获取模型列表失败: ' + resp.status, resp.status);
      const json = await resp.json();
      return (json.models || [])
        .filter(m => m.name && m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
    }

    const endpoint = url.replace(/\/+$/, '') + '/v1/models';
    const headers = { 'Authorization': 'Bearer ' + key };
    const resp = await fetch(endpoint, { method: 'GET', headers });
    if (!resp.ok) throw new AiServiceError('API_ERROR', '获取模型列表失败: ' + resp.status, resp.status);
    const json = await resp.json();
    return (json.data || []).map(m => m.id || m);
  }

  // ─── 挂载到全局 ────────────────────────

  window.AiService = {
    // 错误类
    AiServiceError,
    // 配置
    setChatConfig,
    setImageConfig,
    getChatConfig,
    getImageConfig,
    // 核心方法
    chat,
    generateImage,
    fetchModels,
  };

})();
