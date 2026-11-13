if (location.hostname.endsWith('.github.io') || new URLSearchParams(location.search).get('preview')==='1') {
  await import('./showcase.js');
} else {
  await import('./app.js');
}
