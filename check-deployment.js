#!/usr/bin/env node

/**
 * Pre-deployment Check Script
 * Verifies that the project is ready for Vercel deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Checking deployment readiness...\n');

const checks = [];

// Check 1: Node version files exist
const nodeVersionFiles = ['.nvmrc', '.node-version'];
nodeVersionFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const version = fs.readFileSync(file, 'utf8').trim();
        checks.push({
            name: `${file} exists`,
            status: true,
            message: `✅ Found ${file} with version: ${version}`
        });
    } else {
        checks.push({
            name: `${file} exists`,
            status: false,
            message: `❌ Missing ${file}`
        });
    }
});

// Check 2: vercel.json configuration
if (fs.existsSync('vercel.json')) {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    const hasNodeVersion = vercelConfig.build?.env?.NODE_VERSION;
    checks.push({
        name: 'vercel.json has NODE_VERSION',
        status: !!hasNodeVersion,
        message: hasNodeVersion
            ? `✅ NODE_VERSION set to: ${hasNodeVersion}`
            : '⚠️  NODE_VERSION not set in vercel.json'
    });
} else {
    checks.push({
        name: 'vercel.json exists',
        status: false,
        message: '❌ vercel.json not found'
    });
}

// Check 3: Build test
try {
    console.log('🔨 Testing build...');
    execSync('npm run build', { stdio: 'pipe' });
    checks.push({
        name: 'Build test',
        status: true,
        message: '✅ Build successful'
    });
} catch (error) {
    checks.push({
        name: 'Build test',
        status: false,
        message: '❌ Build failed'
    });
}

// Check 4: dist folder exists
checks.push({
    name: 'dist folder exists',
    status: fs.existsSync('dist'),
    message: fs.existsSync('dist')
        ? '✅ dist folder created'
        : '❌ dist folder not found'
});

// Check 5: package.json has correct scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const hasBuildScript = packageJson.scripts?.build;
checks.push({
    name: 'Build script exists',
    status: !!hasBuildScript,
    message: hasBuildScript
        ? `✅ Build script: ${hasBuildScript}`
        : '❌ No build script in package.json'
});

// Print results
console.log('\n📊 Check Results:\n');
checks.forEach(check => {
    console.log(check.message);
});

const allPassed = checks.every(check => check.status);

console.log('\n' + '='.repeat(50));
if (allPassed) {
    console.log('✅ All checks passed! Ready for deployment.');
    console.log('\nNext steps:');
    console.log('1. git add .');
    console.log('2. git commit -m "fix: Update Node.js version for Vercel"');
    console.log('3. git push');
    process.exit(0);
} else {
    console.log('❌ Some checks failed. Please fix the issues above.');
    process.exit(1);
}
