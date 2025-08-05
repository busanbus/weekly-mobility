const fs = require('fs');
const path = require('path');

// 모든 HTML 파일을 찾아서 footer를 교체하는 함수
function updateFooterInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // 언어 결정
    let lang = 'ko';
    if (filePath.includes('/en/')) lang = 'en';
    else if (filePath.includes('/cn/')) lang = 'cn';
    else if (filePath.includes('/jp/')) lang = 'jp';
    
    // footer 패턴 찾기 및 교체
    const footerRegex = /<footer class="footer">[\s\S]*?<\/footer>/;
    const scriptRegex = /<script type="module" src="([.\/]*components\/floating-sns\.js)"><\/script>/;
    
    if (footerRegex.test(content)) {
      content = content.replace(footerRegex, `<mobility-footer lang="${lang}"></mobility-footer>`);
      updated = true;
      console.log(`  - Replaced footer with ${lang} component`);
    }
    
    // footer.js 스크립트 추가 (아직 없는 경우)
    if (!content.includes('footer.js') && scriptRegex.test(content)) {
      const match = content.match(scriptRegex);
      if (match) {
        const basePath = match[1].replace('floating-sns.js', 'footer.js');
        const newScript = `  <script type="module" src="${basePath}"></script>`;
        content = content.replace(
          scriptRegex,
          `${match[0]}\n${newScript}`
        );
        updated = true;
        console.log(`  - Added footer.js script`);
      }
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
    } else {
      console.log(`- No changes: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`✗ Error: ${filePath}`, error.message);
  }
}

// 모든 week*.html 파일 찾기
function findWeekFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.match(/^week\d+\.html$/) || item === 'index.html') {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

// 실행
const archiveDir = path.join(__dirname, '../archive');
const weekFiles = findWeekFiles(archiveDir);

console.log(`Found ${weekFiles.length} files to process\n`);

weekFiles.forEach(file => {
  console.log(`Processing: ${path.relative(process.cwd(), file)}`);
  updateFooterInFile(file);
  console.log('');
});

console.log('Footer update completed!');