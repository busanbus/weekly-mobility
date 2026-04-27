# 보도자료 허브 백엔드

`press-hub.html` 페이지에 데이터를 공급해 주는 **로컬 FastAPI 서버**입니다.
국토교통부와 각 지자체 보도자료 게시판을 실시간으로 크롤링해 한 페이지에 모아 줍니다.

```
weekly-mobility/
├── press-hub.html              ← 프런트(이 서버가 함께 서빙)
├── components/press-hub.js     ← 프런트 JS
└── server/                     ← 본 폴더
    ├── start.bat               ← Windows 실행기 (더블클릭)
    ├── main.py                 ← FastAPI 본체
    ├── requirements.txt
    └── sources/
        ├── base.py             ← Source / PressItem 추상화
        ├── molit.py            ← 국토교통부 어댑터
        └── __init__.py         ← 출처 레지스트리
```

---

## 1. 처음 한 번만: 실행

1. 이 폴더(`server/`)에서 **`start.bat` 더블클릭**.
2. 자동 진행:
   - 가상환경 `.venv` 생성
   - `requirements.txt` 의 의존성 설치
   - `uvicorn` 으로 서버 시작
   - 브라우저에서 `http://localhost:8000/press-hub.html` 자동 오픈
3. 두 번째 실행부터는 가상환경/의존성 검사만 후 즉시 시작됩니다 (~2초).

> **종료**: 검정 콘솔창에서 `Ctrl + C` 또는 창을 닫으세요.

### Windows 외 환경 / 수동 실행

```bash
cd server
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 2. API

| 엔드포인트            | 설명                                                 |
| --------------------- | ---------------------------------------------------- |
| `GET /api/health`     | 헬스체크                                             |
| `GET /api/sources`    | 등록된 출처 목록 (구현 + 준비중 플레이스홀더)        |
| `GET /api/press`      | 기간/출처별 보도자료 통합 조회 (5분 메모리 캐시)     |
| `GET /` (정적)        | 워크스페이스 루트 그대로 서빙 → `press-hub.html` 등 |

### `/api/press` 파라미터

| 이름       | 예시                                | 설명                              |
| ---------- | ----------------------------------- | --------------------------------- |
| `from`     | `2026-04-20`                        | 시작일 (YYYY-MM-DD)               |
| `to`       | `2026-04-27`                        | 종료일 (YYYY-MM-DD)               |
| `sources`  | `molit` 또는 `molit,seoul`          | 콤마 구분 출처 ID 목록            |

### 응답 예시

```json
{
  "range": { "from": "2026-04-20", "to": "2026-04-27" },
  "stats": {
    "molit": { "name": "국토교통부", "ok": true, "count": 23 }
  },
  "total": 23,
  "items": [
    {
      "source": "molit",
      "sourceName": "국토교통부",
      "num": "12345",
      "category": "보도자료",
      "title": "광역버스 노선 신설 안내",
      "link": "https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=...",
      "date": "2026-04-25",
      "attachment": true,
      "views": "1,203"
    }
  ],
  "generatedAt": "2026-04-27T16:30:12"
}
```

---

## 3. 새 지자체(출처) 추가하는 법

예) 서울특별시 보도자료 추가.

### ① `server/sources/seoul.py` 생성

```python
from typing import List
import httpx
from bs4 import BeautifulSoup
from .base import Source, PressItem


class SeoulSource(Source):
    id = "seoul"
    name = "서울특별시"
    color = "#cc0033"
    enabled = True

    async def fetch(self, from_date: str, to_date: str) -> List[PressItem]:
        # 1) httpx 로 게시판 URL GET
        # 2) BeautifulSoup 으로 행 파싱
        # 3) 기간 필터 후 PressItem 리스트 반환
        ...
```

### ② `server/sources/__init__.py` 의 `IMPLEMENTED` 에 추가

```python
from .seoul import SeoulSource

IMPLEMENTED = [
    MolitSource(),
    SeoulSource(),
]
```

### ③ `start.bat` 재시작
끝. 프런트 칩이 자동으로 활성화됩니다.

> 팁: `PLACEHOLDERS` 에 같은 `id` 가 있으면 그 항목은 자동으로 제거되도록 발전시켜도 좋습니다.

---

## 4. 트러블슈팅

| 증상                                                     | 원인 / 조치                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| 페이지에서 "백엔드 연결 실패" 메시지                     | `start.bat` 미실행 또는 8000 포트 점유. 콘솔창에 에러가 있는지 확인.     |
| 국토부에서 0건                                           | 사이트가 일시적으로 차단/구조 변경. 콘솔 `__pressHubDebug('molit')` 확인 |
| `pip install` 실패 (회사망)                              | 사내 프록시 환경. `pip install --proxy=http://... -r requirements.txt`   |
| 한글 깨짐                                                | 응답 인코딩 자동 보정 코드(`r.encoding = 'utf-8'`) 가 들어 있으니 보고만 |
| 8000 포트가 이미 사용 중                                 | `start.bat` 의 `--port 8000` 을 다른 번호로 수정                         |

### 콘솔 디버그

브라우저 콘솔에서:

```js
__pressHubDebug();              // 마지막 응답 객체
__pressHubDebug('molit', 14);   // 최근 14일치 강제 호출 (출처 ID 지정)
```

---

## 5. 캐시

- 메모리 TTL 캐시(5분).
- 키: `(from, to, 정렬된 sources)` 조합.
- 서버를 재시작하면 캐시가 초기화됩니다.
- 강제 재조회가 필요하면 서버를 재시작하거나 `_cache.clear()` 코드 한 줄 추가.

---

## 6. 라이선스 / 주의

- 이 백엔드는 **개인 PC에서의 업무 자동화용** 도구입니다.
- 정부/지자체 사이트의 robots.txt 와 약관을 준수해 주세요.
  요청 빈도가 너무 높아지지 않도록 캐시(5분)와 페이지 사이 sleep(0.2s) 가 들어 있습니다.
- 응답 데이터는 DB에 저장되지 않으며, 매번 실시간으로 조회합니다.
