# mobility-weekly

모빌리티 주간동향 정적 사이트 + 보도자료 통합 허브.

## 구성

| 영역 | 설명 |
| --- | --- |
| `index.html`, `home.html`, `archive/...` | 기존 주간동향 정적 사이트 (GitHub Pages) |
| `press-hub.html`, `components/press-hub.js` | 국토부/지자체 보도자료 통합 허브 (BETA) |
| `server/` | 보도자료 허브를 위한 로컬 FastAPI 백엔드 |

## 보도자료 허브 빠른 시작

1. `server\start.bat` 더블클릭 (Windows)
2. 자동으로 `http://localhost:8000/press-hub.html` 가 열립니다.
3. 기간 / 출처 선택 후 "불러오기" 클릭.

자세한 사용/확장 방법은 [`server/README.md`](server/README.md) 참고.
