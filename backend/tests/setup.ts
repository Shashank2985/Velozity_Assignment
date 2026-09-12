// Global test setup for backend test suite

process.on('unhandledRejection', (reason: any) => {
  if (reason instanceof Error && reason.message?.includes('Connection is closed')) {
    // Benign teardown redis disconnect error, safe to ignore
    return;
  }
  console.error('Unhandled Rejection during test:', reason);
});
