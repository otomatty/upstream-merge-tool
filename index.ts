import('./src/main').catch((err) => {
  console.error('Failed to load main module:', err);
  process.exit(1);
});