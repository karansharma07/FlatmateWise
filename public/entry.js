if (location.hostname.endsWith('.github.io')) {
  await import('./showcase.js');
} else {
  await import('./app.js');
}
