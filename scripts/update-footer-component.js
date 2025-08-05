const fs = require('fs');
const path = require('path');

// 한국어 footer HTML 패턴
const koFooterPattern = `    <footer class="footer">
      <div class="footer-content">
        <h3 class="footer-title">모빌리티 주간 동향</h3>
        <p class="footer-description">
          모빌리티의 트렌드와 정책 동향을 매주 정리하여 전해드립니다.
        </p>
        <p class="footer-contact" style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">
          문의 : 부산시내버스운송사업조합 전략기획팀<br>
          이메일: <a href="mailto:chha@busanbus.or.kr" style="color:var(--primary-blue);text-decoration:underline;">chha@busanbus.or.kr</a>
        </p>
        <div class="footer-copyright">
          © 2025 Busan Metrobus Company Association. All rights reserved.
        </div>
      </div>
    </footer>`;

// 영어 footer HTML 패턴
const enFooterPattern = `    <footer class="footer">
      <div class="footer-content">
        <h3 class="footer-title">Mobility Weekly Trends</h3>
        <p class="footer-description">
          We provide a weekly summary of mobility trends and policy developments.
        </p>
        <p class="footer-contact" style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">
          Contact: Busan Metrobus Company Association, Strategic Planning Team<br>
          Email: <a href="mailto:chha@busanbus.or.kr" style="color:var(--primary-blue);text-decoration:underline;">chha@busanbus.or.kr</a>
        </p>
        <div class="footer-copyright">
          © 2025 Busan Metrobus Company Association. All rights reserved.
        </div>
      </div>
    </footer>`;

// 중국어 footer HTML 패턴
const cnFooterPattern = `    <footer class="footer">
      <div class="footer-content">
        <h3 class="footer-title">移动出行每周趋势</h3>
        <p class="footer-description">
          我们每周为您整理并带来移动出行的趋势和政策动态。
        </p>
        <p class="footer-contact" style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">
          联系：釜山市内巴士运输事业组合 战略企划팀<br>
          邮箱：<a href="mailto:chha@busanbus.or.kr" style="color:var(--primary-blue);text-decoration:underline;">chha@busanbus.or.kr</a>
        </p>
        <div class="footer-copyright">
          © 2025 Busan Metrobus Company Association. All rights reserved.
        </div>
      </div>
    </footer>`;

// 일본어 footer HTML 패턴
const jpFooterPattern = `    <footer class="footer">
      <div class="footer-content">
        <h3 class="footer-title">モビリティ週間動向</h3>
        <p class="footer-description">
          モビリティのトレンドと政策動向を毎週まとめてお届けします。
        </p>
        <p class="footer-contact" style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">
          お問い合わせ：釜山市内バス運送事業組合 戦略企画チーム<br>
          メール：<a href="mailto:chha@busanbus.or.kr" style="color:var(--primary-blue);text-decoration:underline;">chha@busanbus.or.kr</a>
        </p>
        <div class="footer-copyright">
          © 2025 Busan Metrobus Company Association. All rights reserved.
        </div>
      </div>
    </footer>`;

// 파일 경로와 언어별 매핑
const footerReplacements = [
  { pattern: koFooterPattern, replacement: '<mobility-footer lang="ko"></mobility-footer>', lang: 'ko' },
  { pattern: enFooterPattern, replacement: '<mobility-footer lang="en"></mobility-footer>', lang: 'en' },
  { pattern: cnFooterPattern, replacement: '<mobility-footer lang="cn"></mobility-footer>', lang: 'cn' },
  { pattern: jpFooterPattern, replacement: '<mobility-footer lang="jp"></mobility-footer>', lang: 'jp' }
];

// 스크립트 임포트 추가를 위한 패턴들
const scriptPatterns = [
  {
    // 3단계 상위 경로 (archive/2025/월/week.html)
    find: /(<script type="module" src="\.\.\/\.\.\/\.\.\/components\/floating-sns\.js"><\/script>\s*<\/body>)/,
    replace: '$1\n  <script type="module" src="../../../components/footer.js"></script>\n</body>',
    levels: 3
  },
  {
    // 4단계 상위 경로 (archive/2025/월/언어/week.html)
    find: /(<script type="module" src="\.\.\/\.\.\/\.\.\/\.\.\/components\/floating-sns\.js"><\/script>\s*<\/body>)/,
    replace: '$1\n  <script type="module" src="../../../../components/footer.js"></script>\n</body>',
    levels: 4
  }
];

function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    
    if (stat.isDirectory()) {
      walkDirectory(filepath, callback);
    } else if (file.endsWith('.html') && (file.startsWith('week') || file === 'index.html')) {
      callback(filepath);
    }
  });
}

function determineLanguageFromPath(filepath) {
  if (filepath.includes('/en/')) return 'en';
  if (filepath.includes('/cn/')) return 'cn';
  if (filepath.includes('/jp/')) return 'jp';
  return 'ko'; // 기본값
}

function determinePathLevels(filepath) {
  const parts = filepath.replace(/\\/g, '/').split('/');
  const archiveIndex = parts.indexOf('archive');
  if (archiveIndex === -1) return 3;
  
  // archive/2025/월/week.html = 4개 부분 (3 levels up)
  // archive/2025/월/언어/week.html = 5개 부분 (4 levels up)
  return parts.length - archiveIndex - 2;
}

function updateFile(filepath) {
  console.log(`Processing: ${filepath}`);
  
  try {
    let content = fs.readFileSync(filepath, 'utf8');
    const lang = determineLanguageFromPath(filepath);
    const levels = determinePathLevels(filepath);
    
    let updated = false;
    
    // footer 교체
    footerReplacements.forEach(({ pattern, replacement, lang: patternLang }) => {
      if (lang === patternLang && content.includes(pattern)) {
        content = content.replace(pattern, `    ${replacement}`);
        updated = true;
        console.log(`  - Replaced ${patternLang} footer`);
      }
    });
    
    // 스크립트 추가 (아직 없는 경우에만)
    if (!content.includes('footer.js')) {
      const scriptPattern = scriptPatterns.find(p => p.levels === levels);
      if (scriptPattern && scriptPattern.find.test(content)) {
        content = content.replace(scriptPattern.find, scriptPattern.replace);
        updated = true;
        console.log(`  - Added footer.js script import`);
      }
    }
    
    if (updated) {
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`  ✓ Updated successfully`);
    } else {
      console.log(`  - No changes needed`);
    }
    
  } catch (error) {
    console.error(`  ✗ Error processing ${filepath}:`, error.message);
  }
}

// 메인 실행
const archiveDir = path.join(__dirname, '../archive');

console.log('Starting footer component update...\n');

walkDirectory(archiveDir, updateFile);

console.log('\nFooter component update completed!');