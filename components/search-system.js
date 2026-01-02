/**
 * 구글 시트 기반 검색 시스템
 * 시트 URL: https://docs.google.com/spreadsheets/d/1i5SvFe6pBJmrAP_CpA2a0cgRFfPqoM7IPYvXb7uHjk0
 */

class SearchSystem {
  constructor() {
    this.sheetId = '1i5SvFe6pBJmrAP_CpA2a0cgRFfPqoM7IPYvXb7uHjk0';
    this.csvUrl = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=0`;
    this.searchableData = [];
    this.isDataLoaded = false;
  }

  /**
   * 구글 시트에서 CSV 데이터를 가져와서 파싱
   */
  async loadData() {
    try {
      console.log('📊 구글 시트에서 데이터 로딩 중...');
      const response = await fetch(this.csvUrl);
      const csvText = await response.text();
      
      this.searchableData = this.parseCSVToSearchableData(csvText);
      this.isDataLoaded = true;
      
      console.log(`✅ ${this.searchableData.length}개의 검색 가능한 뉴스 아이템 로드 완료`);
      return this.searchableData;
    } catch (error) {
      console.error('❌ 데이터 로딩 실패:', error);
      throw error;
    }
  }

  /**
   * CSV 텍스트를 검색 가능한 개별 뉴스 아이템으로 변환
   */
  parseCSVToSearchableData(csvText) {
    const lines = csvText.split('\n');
    const headers = this.parseCSVLine(lines[0]);
    const searchableItems = [];

    // 헤더 인덱스 매핑
    const headerMap = {};
    headers.forEach((header, index) => {
      headerMap[header.trim()] = index;
    });

    // 데이터 행들 처리 (헤더 제외)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      if (values.length < 4) continue; // 최소 필수 데이터 확인

      const year = values[headerMap['년도']] || '';
      const month = values[headerMap['월']] || '';
      const week = values[headerMap['주차']] || '';
      const pdfUrl = values[headerMap['PDF URL']] || '';
      const publishDate = values[headerMap['발행일']] || ''; // YYYY.MM.DD 형식 (예: 2026.01.05)

      // 빈 년도/월/주차는 건너뛰기
      if (!year || !month || !week) continue;

      // 각 뉴스 카드 (1~15번)를 개별 검색 아이템으로 변환
      for (let newsIndex = 1; newsIndex <= 15; newsIndex++) {
        const title = values[headerMap[`제목${newsIndex}`]] || '';
        const category = values[headerMap[`카테고리${newsIndex}`]] || '';
        const summary = values[headerMap[`요약${newsIndex}`]] || '';
        const image = values[headerMap[`이미지${newsIndex}`]] || '';
        const link = values[headerMap[`링크${newsIndex}`]] || '';

        // 제목이 있는 경우만 검색 아이템으로 추가
        if (title && title.trim()) {
          const monthPadded = month.toString().padStart(2, '0');
          
          searchableItems.push({
            // 기본 정보
            year: parseInt(year),
            month: parseInt(month),
            week: parseInt(week),
            pdfUrl: pdfUrl.trim(),
            publishDate: publishDate.trim(), // 발행일 (YYYY.MM.DD 형식)
            
            // 뉴스 정보
            title: title.trim(),
            category: category.trim(),
            summary: summary.trim(),
            image: image.trim(),
            link: link.trim(),
            newsIndex: newsIndex,
            
            // 생성된 정보
            weeklyUrl: `/weekly-mobility/archive/${year}/${monthPadded}/week${week}.html`,
            dateText: `${year}년 ${month}월 ${week}주차`,
            
            // 검색용 통합 텍스트
            searchText: `${title} ${category} ${summary}`.toLowerCase()
          });
        }
      }
    }

    // 최신순으로 정렬 (년도, 월, 주차 내림차순)
    searchableItems.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      if (a.week !== b.week) return b.week - a.week;
      return a.newsIndex - b.newsIndex;
    });

    return searchableItems;
  }

  /**
   * CSV 라인을 파싱 (콤마 구분, 따옴표 처리)
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 연속된 따옴표는 하나의 따옴표로 처리
          current += '"';
          i += 2;
          continue;
        } else {
          // 따옴표 시작/끝
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 콤마로 구분
        result.push(current);
        current = '';
      } else {
        current += char;
      }
      i++;
    }

    result.push(current);
    return result;
  }

  /**
   * 키워드로 뉴스 검색
   */
  async search(keyword, maxResults = 20) {
    // 데이터가 로드되지 않았으면 로드
    if (!this.isDataLoaded) {
      await this.loadData();
    }

    if (!keyword || keyword.trim().length === 0) {
      return [];
    }

    const searchTerm = keyword.toLowerCase().trim();
    
    const results = this.searchableData.filter(item => {
      return item.searchText.includes(searchTerm);
    });

    // 결과 제한
    return results.slice(0, maxResults);
  }

  /**
   * 카테고리별 검색
   */
  async searchByCategory(category, maxResults = 20) {
    if (!this.isDataLoaded) {
      await this.loadData();
    }

    const results = this.searchableData.filter(item => {
      return item.category.toLowerCase().includes(category.toLowerCase());
    });

    return results.slice(0, maxResults);
  }

  /**
   * 기간별 검색
   */
  async searchByPeriod(year, month = null, week = null, maxResults = 20) {
    if (!this.isDataLoaded) {
      await this.loadData();
    }

    const results = this.searchableData.filter(item => {
      if (item.year !== parseInt(year)) return false;
      if (month !== null && item.month !== parseInt(month)) return false;
      if (week !== null && item.week !== parseInt(week)) return false;
      return true;
    });

    return results.slice(0, maxResults);
  }

  /**
   * 검색 결과를 하이라이트 처리
   */
  highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * 인기 카테고리 가져오기
   */
  async getPopularCategories() {
    if (!this.isDataLoaded) {
      await this.loadData();
    }

    const categoryCount = {};
    this.searchableData.forEach(item => {
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }
    });

    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));
  }

  /**
   * 최근 뉴스 가져오기
   */
  async getRecentNews(maxResults = 10) {
    if (!this.isDataLoaded) {
      await this.loadData();
    }

    return this.searchableData.slice(0, maxResults);
  }
}

// 전역 검색 시스템 인스턴스
window.searchSystem = new SearchSystem();

export default SearchSystem;