# 일본어 단어장 웹앱 (voca)

## 목적
JPT 900점을 목표로, 하루 새 단어 N개(기본 20, 설정에서 변경 가능)씩 꾸준히 전진하는 개인용 일본어 단어장 웹앱.
복습 단어는 새 단어와 별도로 더 많이 나올 수 있음.

## 사용 환경
- 휴대폰 우선 반응형 웹앱(PC에서도 사용)
- 로그인/서버 없음. 모든 데이터는 브라우저(IndexedDB)에 저장

## 기술 스택 (확정)
- **Vite + React + TypeScript**: 빠른 개발 서버, 정적 파일로 빌드되어 서버 없이 배포 가능. 디자인 시안이 컴포넌트 구조라 React와 잘 맞음
- **Dexie.js**: IndexedDB 래퍼. 스키마 버전 관리·인덱스 쿼리가 쉬워 수천 개 단어와 학습 기록 분리 저장에 적합
- **dexie-react-hooks**: Dexie 공식 React 훅(`useLiveQuery`). DB가 바뀌면 화면이 자동으로 갱신됨
- **PapaParse**: CSV 파싱. 따옴표·줄바꿈 포함 필드, 헤더 처리 등 구글시트/엑셀 CSV를 안정적으로 처리
- **CSS Modules + CSS 변수**: 테마(Soft/Mono) 전환을 CSS 변수로 처리 (`<html data-theme="soft|mono">`)
- **React Router (HashRouter)**: 탭 4개 화면 전환. 해시 방식이라 정적 호스팅에서도 새로고침 시 404가 나지 않음
- 린트는 Vite 템플릿 기본값인 oxlint 사용

## 실행 방법
- `npm install` — 의존성 설치
- `npm run dev` — 개발 서버 (http://localhost:5173, 휴대폰에서 보려면 `npm run dev -- --host`)
- `npm run build` — 타입 체크 + `dist/`에 정적 빌드
- `npm run lint` — oxlint

## 폴더 구조
- `src/types.ts` — Word / Progress / Settings 타입과 기본 설정
- `src/db.ts` — Dexie DB 스키마 (words, progress, settings 테이블)
- `src/index.css` — 테마 토큰(CSS 변수)과 기본 스타일
- `src/components/Layout.tsx` — 하단 탭 / PC 왼쪽 메뉴 레이아웃
- `src/pages/` — 홈, 학습, 단어 목록, 설정, CSV 가져오기(`/settings/import`) 화면
- `src/lib/csv.ts` — CSV 디코딩(UTF-8 실패 시 EUC-KR), 파싱, 열 매핑 추측
- 홈은 오늘 배정을 읽기만 하고 만들지 않음(배정은 학습 화면을 열 때 생성). 배정 전이면 '오늘 받게 될 개수'를 표시
- `src/lib/daily.ts` — 하루 배정(`daily` 테이블, 날짜별 저장)과 채점. 새 단어 묶음은 최상위 필드, 복습 묶음은 `review`
  - 새 단어: 학습 기록이 없는 단어 중 N개. 전날 배정만 되고 손대지 않은 단어를 먼저 채움
  - 복습: 학습 화면을 처음 열 때 `nextReviewAt`이 오늘까지인 단어로 만듦(개수 제한 없음, 오늘 새 단어는 제외)
  - 그날 처음 채점한 결과로만 다음 복습일을 정함. [모르겠어요]는 남은 카드 맨 뒤로 보내 오늘 안에 다시 출제
- `src/lib/srs.ts` — 간격 반복(SM-2를 버튼 두 개에 맞게 단순화)
  - 알아요: 주기 1일 → 3일 → 이후 주기 × ease, ease +0.05(최대 3.0)
  - 모르겠어요: reps 0, 주기 1일(내일), ease −0.2(최소 1.3)
  - 상태: 주기 21일 이상이면 '외움', 그 전까지 '학습 중'
  - DB v3 마이그레이션과 예전 백업은 `withSrsDefaults`로 기본값을 채움
- `src/lib/backup.ts` — JSON 백업 내보내기/불러오기(불러오기는 전체 덮어쓰기)
- 설정 변경: 하루 개수·뽑는 방식은 오늘 아직 채점 전이면 오늘 배정을 다시 뽑고, 시작했으면 내일부터 적용. 테마는 `<html data-theme>`에 즉시 반영하고 깜빡임 방지용으로 localStorage에도 사본 저장
- `src/lib/words.ts` — 단어 수정, 삭제(학습 기록도 함께 삭제)
- `src/components/Sheet.tsx` — 아래에서 올라오는 시트(상세/편집에 사용)
- `src/lib/importWords.ts` — 단어 병합 저장. 한자 표기+읽는 법이 같으면 id 유지하고 내용만 갱신(학습 기록 유지), CSV에 없는 기존 단어는 삭제하지 않음
- 그 외 라이브러리를 추가할 때는 이유를 간단히 설명하고 추가할 것

## MVP 기능
- **CSV 가져오기**: 구글시트/엑셀에서 내보낸 CSV 업로드. 열 매핑 화면에서 어떤 열이 한자표기/읽는법/뜻/예문인지 선택. 단어는 수천 개 규모
- **오늘의 새 단어**: 아직 학습하지 않은 단어 중 N개를 무작위로 배정(설정에서 순서대로 모드도 선택 가능). 다 못 하면 이어서 가능
- **플래시카드**: 앞면 일본어, 탭하면 뒷면(읽는 법/뜻/예문). [모르겠어요] [알아요] 버튼
- **진행 현황**: 오늘 진행률(예: 12/20), 전체 학습/남은 단어 수
- **단어 목록**: 검색, 상태 필터(새 단어/학습 중/외움), 수정/삭제
- **설정**: 하루 새 단어 수, 뽑는 방식, CSV 가져오기, JSON 백업 내보내기/불러오기, 테마(Soft/Mono)

## 다음 단계 후보 (지금 만들지 말 것)
퀴즈, 발음 듣기(브라우저 TTS), 후리가나 토글, 오답 노트, 통계, 태그.

## 데이터 구조
- **단어(Word)**: id, word, reading, meaning, example(선택), memo(선택), order(CSV 행 번호)
- **학습 기록(Progress, 단어와 분리)**: wordId, status(새 단어/학습 중/외움), firstStudiedAt, lastStudiedAt, correctCount, wrongCount, nextReviewAt, interval(복습 주기·일), ease(난이도 계수), reps(연속 정답 수)
- **설정(Settings)**: 하루 새 단어 수, 뽑는 방식, 테마
- 저장은 IndexedDB(Dexie). 단어 정보와 학습 기록을 분리해서, CSV를 다시 가져와도 학습 기록이 유지되게 하고 나중에 복습 기능을 붙이기 쉽게 할 것

## 화면
하단 탭 4개(PC에서는 왼쪽 메뉴): 홈(오늘) / 학습 / 단어 목록 / 설정

## 디자인
- `design/` 폴더의 HTML 시안을 따를 것
  - `VocabSoft.dc.html`: 밝은 테마(#eef0f6 배경, 보라 계열 포인트, M PLUS Rounded 1c)
  - `VocabMono.dc.html`: 어두운 테마(#0e0e0d 배경, 라임 포인트, Zen Old Mincho / Zen Kaku Gothic New)
  - 공통 본문 글꼴: Pretendard
- 두 시안을 모두 테마로 구현하고 설정에서 전환
- `design/support.js`, `design/vocab-core.js`는 시안 렌더링용(샘플 데이터 포함)이므로 앱 코드에 그대로 가져오지 말고 참고만 할 것

## 작업 규칙
- 한 번에 한 기능씩 만들고, 끝나면 실행 방법을 알려줄 것
- 사용하는 라이브러리와 이유는 간단히 설명할 것
- 루트의 기존 `index.html`은 이 프로젝트와 무관한 할 일 목록 예제이므로, 앱 구조를 만들 때 처리 방법(삭제/이동)을 먼저 물어볼 것
