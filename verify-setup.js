#!/usr/bin/env node

/**
 * Setup Verification Script
 * Checks that all prerequisites are met before running the service
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

console.log('🔍 Verifying Salesforce Document Conversion Service Setup...\n');

let hasErrors = false;

// Check 1: Node.js version
console.log('1️⃣  Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 18) {
  console.log(`   ✅ Node.js ${nodeVersion} (OK)\n`);
} else {
  console.log(`   ❌ Node.js ${nodeVersion} (Need v18 or later)\n`);
  hasErrors = true;
}

// Check 2: Environment variables
console.log('2️⃣  Checking environment variables...');
const requiredVars = [
  'SF_CLIENT_ID',
  'SF_CLIENT_SECRET',
  'SF_LOGIN_URL',
  'SOFFICE_EXE',
];

let envOk = true;
requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}`);
  } else {
    console.log(`   ❌ ${varName} (missing)`);
    envOk = false;
    hasErrors = true;
  }
});

if (envOk) {
  console.log('   All required environment variables are set\n');
} else {
  console.log('   Some environment variables are missing. Source env.sh or create .env file\n');
}

// Check 3: LibreOffice
console.log('3️⃣  Checking LibreOffice installation...');
if (process.env.SOFFICE_EXE) {
  execAsync(`"${process.env.SOFFICE_EXE}" --version`)
    .then(({ stdout }) => {
      console.log(`   ✅ ${stdout.trim()}\n`);
    })
    .catch(() => {
      console.log(`   ❌ LibreOffice not found at: ${process.env.SOFFICE_EXE}\n`);
      hasErrors = true;
    })
    .then(() => {
      // Check 4: Dependencies
      console.log('4️⃣  Checking dependencies...');
      try {
        require('@grpc/grpc-js');
        require('avsc');
        require('axios');
        require('form-data');
        console.log('   ✅ All dependencies installed\n');
      } catch (error) {
        console.log('   ❌ Dependencies missing. Run: npm install\n');
        hasErrors = true;
      }

      // Check 5: Build
      console.log('5️⃣  Checking TypeScript build...');
      const fs = require('fs');
      if (fs.existsSync('./dist/index.js')) {
        console.log('   ✅ Project is built\n');
      } else {
        console.log('   ⚠️  Project not built yet. Run: npm run build\n');
      }

      // Summary
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (hasErrors) {
        console.log('❌ Setup verification FAILED');
        console.log('\nPlease fix the errors above before running the service.');
        process.exit(1);
      } else {
        console.log('✅ Setup verification PASSED');
        console.log('\nYou can now run the service with: npm start');
        process.exit(0);
      }
    });
} else {
  // Skip LibreOffice check and continue
  console.log('   ⚠️  SOFFICE_EXE not set, skipping LibreOffice check\n');

  // Check 4: Dependencies
  console.log('4️⃣  Checking dependencies...');
  try {
    require('@grpc/grpc-js');
    require('avsc');
    require('axios');
    require('form-data');
    console.log('   ✅ All dependencies installed\n');
  } catch (error) {
    console.log('   ❌ Dependencies missing. Run: npm install\n');
    hasErrors = true;
  }

  // Check 5: Build
  console.log('5️⃣  Checking TypeScript build...');
  const fs = require('fs');
  if (fs.existsSync('./dist/index.js')) {
    console.log('   ✅ Project is built\n');
  } else {
    console.log('   ⚠️  Project not built yet. Run: npm run build\n');
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (hasErrors) {
    console.log('❌ Setup verification FAILED');
    console.log('\nPlease fix the errors above before running the service.');
    process.exit(1);
  } else {
    console.log('⚠️  Setup verification PASSED (with warnings)');
    console.log('\nYou can now run the service with: npm start');
    process.exit(0);
  }
}
