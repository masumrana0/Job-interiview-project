import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

async function packageZip() {
  const rootDir = path.resolve(__dirname, '..');
  const outputZipPath = path.resolve(rootDir, 'appointment-booking-api.zip');

  console.log('📦 Starting packaging of clean submission ZIP...');
  console.log(`Target output: ${outputZipPath}`);

  if (fs.existsSync(outputZipPath)) {
    fs.unlinkSync(outputZipPath);
  }

  const output = fs.createWriteStream(outputZipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  output.on('close', () => {
    const sizeInKb = (archive.pointer() / 1024).toFixed(2);
    console.log(`\n✅ Successfully generated clean submission ZIP: ${path.basename(outputZipPath)} (${sizeInKb} KB)`);
    console.log('Included files: source, manifest & lockfile, prisma schema, migrations, seed, tests, README, .env.example');
    console.log('Excluded files: node_modules, real .env, credentials, secrets, build artifacts.');
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // Files to directly include
  const individualFiles = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'jest.config.js',
    '.env.example',
    '.gitignore',
    'README.md'
  ];

  for (const file of individualFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file });
      console.log(` + Added file: ${file}`);
    }
  }

  // Directories to include
  const directoriesToInclude = ['src', 'prisma', 'tests', 'scripts'];

  for (const dir of directoriesToInclude) {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
      archive.directory(dirPath, dir, (entry) => {
        // Exclude unwanted files inside included directories
        if (entry.name.includes('.env') || entry.name.includes('node_modules')) {
          return false;
        }
        return entry;
      });
      console.log(` + Added directory: ${dir}/`);
    }
  }

  await archive.finalize();
}

packageZip().catch((err) => {
  console.error('❌ Failed to package ZIP:', err);
  process.exit(1);
});
