import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

const webDir = path.resolve(__dirname, 'sediment/www');
const distDir = path.resolve(__dirname, 'dist');
const downloads: Record<string, {file: string; type: string}> = {
  '/sediment-debug.apk': {
    file: path.resolve(__dirname, 'sediment-debug.apk'),
    type: 'application/vnd.android.package-archive',
  },
  '/sediment-project.zip': {
    file: path.resolve(__dirname, 'sediment-project.zip'),
    type: 'application/zip',
  },
};

function sedimentStaticPlugin(): Plugin {
  return {
    name: 'sediment-static-and-downloads',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url?.split('?')[0];
        const entry = urlPath ? downloads[urlPath] : undefined;
        if (entry && fs.existsSync(entry.file)) {
          const stat = fs.statSync(entry.file);
          res.setHeader('Content-Type', entry.type);
          res.setHeader('Content-Length', String(stat.size));
          res.setHeader('Content-Disposition', `attachment; filename="${path.basename(entry.file)}"`);
          fs.createReadStream(entry.file).pipe(res);
          return;
        }
        next();
      });
    },
    closeBundle(error?: Error) {
      if (error || !fs.existsSync(distDir)) {
        return;
      }
      for (const entry of ['fonts', 'icons', 'manifest.webmanifest', 'sw.js']) {
        const src = path.join(webDir, entry);
        const dest = path.join(distDir, entry);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, {recursive: true, force: true});
        }
      }
      for (const [urlPath, entry] of Object.entries(downloads)) {
        if (fs.existsSync(entry.file)) {
          fs.copyFileSync(entry.file, path.join(distDir, urlPath.slice(1)));
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    root: webDir,
    publicDir: false as const,
    plugins: [sedimentStaticPlugin()],
    build: {
      outDir: distDir,
      emptyOutDir: true,
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
