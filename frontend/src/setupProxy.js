const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Read backend port from environment variable (default: 3001)
  const backendPort = process.env.BACKEND_PORT || '3001';
  const target = `http://localhost:${backendPort}`;

  console.log(`[Proxy] Configuring API proxy: /api/* -> ${target}/api/*`);

  // Use context matching with pathRewrite to add /api back to forwarded requests
  // Express strips '/api' when using app.use('/api', ...), so we need to add it back
  // This way: /api/user/me -> Express strips to /user/me -> pathRewrite adds /api back -> /api/user/me
  app.use(
    '/api',
    createProxyMiddleware({
      target: target,  // No /api suffix - pathRewrite handles it
      changeOrigin: true,
      logLevel: 'debug',
      pathRewrite: {
        '^/': '/api/'  // Add /api back to the path (Express strips it from context)
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
