const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Read backend port from environment variable (default: 3001)
  const backendPort = process.env.BACKEND_PORT || '3001';
  const target = `http://localhost:${backendPort}`;

  console.log(`[Proxy] Configuring API proxy: /api/* -> ${target}/api/*`);

  // Use context matching with target that includes /api path
  // This way: /api/user/me -> strips to /user/me -> proxies to target/api + /user/me
  app.use(
    '/api',
    createProxyMiddleware({
      target: `${target}/api`,  // Include /api in target
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        // req.url is the path AFTER /api is stripped by Express
        console.log(`[Proxy] ${req.method} /api${req.url} -> ${target}/api${req.url}`);
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
