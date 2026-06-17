const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite no web usa o wa-sqlite via WebAssembly. Sem isso o Metro nao resolve
// "./wa-sqlite/wa-sqlite.wasm" e o `expo export --platform web` falha.
config.resolver.assetExts.push('wasm');

// O wa-sqlite (OPFS/SharedArrayBuffer) exige os headers COOP/COEP no navegador.
// Isso cobre o dev server (`expo start --web`). Para o build estatico exportado,
// o mesmo precisa ser configurado no host (ver nota abaixo).
config.server = config.server ?? {};
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const base = originalEnhanceMiddleware ? originalEnhanceMiddleware(middleware, server) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return base(req, res, next);
  };
};

module.exports = config;
