addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // CORS 预检
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  // 从路径提取目标地址: /proxy/https://api.xxx.com/v1/...
  const path = url.pathname;
  const prefix = "/proxy/";
  if (!path.startsWith(prefix)) {
    return new Response("用法: /proxy/https://api.example.com/v1/...", { status: 400 });
  }
  const targetUrl = path.substring(prefix.length) + url.search;

  // 转发请求
  const init = {
    method: request.method,
    headers: request.headers
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
  }

  const response = await fetch(targetUrl, init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}
