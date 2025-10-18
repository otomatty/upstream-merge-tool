import('./src/main.ts').catch((err) => {
  console.error('Failed to load main module:', err);
  process.exit(1);
});