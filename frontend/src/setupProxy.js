const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Read backend port from environment variable (default: 3001)
  const backendPort = process.env.BACKEND_PORT || '3001';
  const target = `http://localhost:${backendPort}`;

  console.log(`[Proxy] Configuring API proxy: /api/* -> ${target}/api/*`);

  // Use context matching with pathRewrite to keep /api in forwarded requests
  // This way: /api/user/me -> matches /api context -> proxies to target + /api/user/me
  app.use(
    '/api',
    createProxyMiddleware({
      target: target,  // No /api suffix - pathRewrite handles it
      changeOrigin: true,
      logLevel: 'debug',
      pathRewrite: {
        '^/api': '/api'  // Explicitly keep /api in forwarded requests
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy] ${req.method} ${req.url} -> ${target}${req.url}`);
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error] Failed to proxy ${req.url}:`, err.message);
        res.status(500).json({
          error: 'Proxy Error',
          message: `Failed to connect to backend at ${target}`
        });
      }
    })
  );
};
