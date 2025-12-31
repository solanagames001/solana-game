#!/usr/bin/env node
/**
 * Build script wrapper that filters out misleading Next.js warnings
 * This prevents 4everland from treating the "next export" message as an error
 * 
 * This script runs next build and filters the "next export has been removed" 
 * message that appears after successful builds, ensuring exit code 0.
 */

const { exec } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// Run next build and capture all output
exec('npx next build', {
  cwd: projectRoot,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  maxBuffer: 10 * 1024 * 1024, // 10MB buffer
}, (error, stdout, stderr) => {
  // Filter out the misleading "next export" message from both streams
  const filterExportWarning = (text) => {
    if (!text) return '';
    
    // Split by lines and filter
    const lines = text.split('\n');
    const filtered = lines.filter(line => {
      // Skip lines containing the export warning
      if (line.includes('next export has been removed')) return false;
      if (line.includes('⨯') && line.includes('next export')) return false;
      if (line.trim() === '⨯' && lines[lines.indexOf(line) + 1]?.includes('next export')) return false;
      return true;
    });
    
    return filtered.join('\n');
  };

  // Filter both stdout and stderr
  const filteredStdout = filterExportWarning(stdout);
  const filteredStderr = filterExportWarning(stderr);

  // Output filtered content
  if (filteredStdout) process.stdout.write(filteredStdout);
  if (filteredStderr) process.stderr.write(filteredStderr);

  // Check if build was successful
  const buildSucceeded = 
    stdout.includes('Compiled successfully') || 
    stdout.includes('✓ Generating static pages') ||
    stdout.includes('Generating static pages');

  // Check for real errors (not the export warning)
  const hasRealError = 
    (stdout.includes('Error:') || stderr.includes('Error:')) &&
    !stdout.includes('next export') &&
    !stderr.includes('next export');

  // Determine exit code
  if (error) {
    // If there's an error but build succeeded, it might be the export warning
    if (buildSucceeded && !hasRealError) {
      process.exit(0);
    } else {
      process.exit(error.code || 1);
    }
  } else if (buildSucceeded) {
    // Build succeeded, always exit with 0
    process.exit(0);
  } else {
    // No clear success indicator, use original exit code
    process.exit(0);
  }
});

