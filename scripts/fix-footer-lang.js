const fs = require('fs');
const path = require('path');

// 언어별 경로 패턴과 올바른 언어 코드 매핑
const langMappings = [
  { pattern: '/en/', correctLang: 'en' },
  { pattern: '/cn/', correctLang: 'cn' },
  { pattern: '/jp/', correctLang: 'jp' }
];

function determineCorrectLang(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  for (const mapping of langMappings) {
    if (normalizedPath.includes(mapping.pattern)) {
      return mapping.correctLang;
    }
  }
  return 'ko'; // 기본값
}

function updateFooterLang(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const correctLang = determineCorrectLang(filePath);
    
    // 현재 잘못된 lang 속성 찾기
    const currentMatch = content.match(/<mobility-footer lang="(\w+)"><\/mobility-footer>/);
    
    if (currentMatch) {
      const currentLang = currentMatch[1];
      
      if (currentLang !== correctLang) {
        // 잘못된 언어 코드를 올바른 것으로 교체
        const updatedContent = content.replace(
          `<mobility-footer lang="${currentLang}"></mobility-footer>`,
          `<mobility-footer lang="${correctLang}"></mobility-footer>`
        );
        
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`✓ Fixed: ${filePath} (${currentLang} → ${correctLang})`);
        return true;
      } else {
        console.log(`- OK: ${filePath} (${correctLang})`);
        return false;
      }
    } else {
      console.log(`- No footer found: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`✗ Error: ${filePath}`, error.message);
    return false;
  }
}

// 모든 HTML 파일 찾기
function findHtmlFiles(dir) {
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
const htmlFiles = findHtmlFiles(archiveDir);

console.log(`Found ${htmlFiles.length} HTML files\n`);

let fixedCount = 0;

htmlFiles.forEach(file => {
  if (updateFooterLang(file)) {
    fixedCount++;
  }
});

console.log(`\nCompleted! Fixed ${fixedCount} files.`);