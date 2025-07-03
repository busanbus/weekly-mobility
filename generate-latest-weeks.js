const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ARCHIVE_DIR = path.join(__dirname, 'archive');
const OUTPUT_JSON = path.join(ARCHIVE_DIR, 'latest-weeks.json');

function getDirs(srcPath) {
  return fs.readdirSync(srcPath)
    .filter(file => fs.statSync(path.join(srcPath, file)).isDirectory())
    .sort((a, b) => Number(b) - Number(a)); // 최신순 정렬
}

function getWeekFiles(monthDir) {
  return fs.readdirSync(monthDir)
    .filter(file => /^week\d+\.html$/.test(file))
    .sort((a, b) => {
      const aNum = Number(a.match(/week(\d+)\.html/)[1]);
      const bNum = Number(b.match(/week(\d+)\.html/)[1]);
      return bNum - aNum; // 최신순
    });
}

function extractTitlesFromHtml(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);
  const titles = [];
  $('h2.news-title').each((_, el) => {
    titles.push($(el).text().trim());
  });
  return titles;
}

function scanLatestWeeks() {
  const result = [];
  const years = getDirs(ARCHIVE_DIR);
  for (const year of years) {
    const yearDir = path.join(ARCHIVE_DIR, year);
    const months = getDirs(yearDir);
    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      const weekFiles = getWeekFiles(monthDir);
      for (const weekFile of weekFiles) {
        const weekMatch = weekFile.match(/week(\d+)\.html/);
        if (!weekMatch) continue;
        const weekNum = Number(weekMatch[1]);
        const htmlPath = path.join(monthDir, weekFile);
        const relPath = path.relative(__dirname, htmlPath).replace(/\\/g, '/');
        const titles = extractTitlesFromHtml(htmlPath);
        result.push({
          year: Number(year),
          month: Number(month),
          week: weekNum,
          path: relPath,
          titles
        });
        if (result.length >= 5) return result;
      }
    }
  }
  return result;
}

function main() {
  const latestWeeks = scanLatestWeeks();
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(latestWeeks, null, 2), 'utf-8');
  console.log(`최신 5개 주차 정보가 ${OUTPUT_JSON}에 저장되었습니다.`);
}

main(); 