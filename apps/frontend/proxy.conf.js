const target = process.env.API_PROXY_TARGET || 'http://localhost:3000';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
  },
  '/renfe': {
    target: 'https://data.renfe.com/api/3/action',
    secure: false,
    changeOrigin: true,
    pathRewrite: {
      '^/renfe': ''
    }
  },
  '/largorecorrido': {
    target: 'https://tiempo-real.largorecorrido.renfe.com',
    secure: false,
    changeOrigin: true,
    pathRewrite: {
      '^/largorecorrido': ''
    }
  }
};
