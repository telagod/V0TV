#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 生成随机密码
function generatePassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }

  return password;
}

const passwordFile = path.join(__dirname, '..', 'PASSWORD.txt');

// 如果密码文件不存在，生成新密码
if (!fs.existsSync(passwordFile)) {
  const password = generatePassword();
  const content = `V0TV Admin Password
==================
Generated: ${new Date().toISOString()}

Password: ${password}

⚠️  Please save this password securely!
⚠️  This file is in .gitignore and will not be committed.
`;

  fs.writeFileSync(passwordFile, content, 'utf-8');
  console.log('✅ Generated new admin password in PASSWORD.txt');
} else {
  console.log('ℹ️  Password file already exists, skipping generation');
}
