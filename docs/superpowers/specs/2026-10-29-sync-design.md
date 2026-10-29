# 기기 간 동기화 설계 (Supabase + 동기화 코드)

작성일: 2026-10-29

## 목적

아이폰과 PC에서 번갈아 공부하면서 같은 단어·진도·오늘 배정을 보고 싶다.
지금은 모든 데이터가 브라우저 IndexedDB에만 있어서 브라우저나 기기가 바뀌면 단어(CSV로 가져온 것)와 학습 기록이 모두 따로 논다.

### 성공 기준
- 폰에서 공부하고 PC를 열면 같은 진도, 같은 오늘 남은 카드가 보인다.
- 한쪽에서 CSV를 가져오거나 단어를 수정·삭제하면 다른 쪽에도 반영된다.
- 오프라인에서도 지금처럼 공부할 수 있고, 연결되면 맞춰진다.
- 동기화가 실패해도 학습을 막지 않는다.

### 전제(사용자 확인)
- 사용자는 한 명. 두 기기를 **번갈아** 쓰고 동시에 쓰는 일은 거의 없다.
- 지금은 로그인 없이 시작하고, 나중에 로그인을 붙일 수 있어야 한다.

### 범위 밖
- 로그인(나중 단계. 붙이는 방법만 아래에 정리)
- 여러 사용자, 실시간 동시 편집, QR 코드로 연결

## 결정 사항 요약

| 항목 | 결정 |
|---|---|
| 저장소 | Supabase(무료 플랜) 테이블 하나 + RPC 함수 `pull`, `push` |
| 기기 식별 | 무작위 128비트 동기화 코드. 코드를 알면 읽고 쓸 수 있음 |
| 클라이언트 | 라이브러리 없이 `fetch`로 RPC 호출(로그인 붙일 때 `supabase-js` 도입) |
| 동기화 대상 | 단어, 학습 기록, 하루 배정, 설정 (전부. 테마·하루 개수도 기기 간 같게 맞춰짐) |
| 단어 식별 | 기기 안은 기존 숫자 id 유지, 동기화 경계에서만 단어 키(`word`+`reading`)로 변환 |
| 충돌 규칙 | 레코드별 `modifiedAt`이 늦은 쪽 우선(Last Writer Wins) |
| 단어 목록 앱 내장 | 하지 않음(동기화로 대체, 단어장 공개도 피함) |
| 테스트 | `vitest` + `fake-indexeddb` 추가 |

## 1. 데이터 구조

### 1.1 단어 키
- `wordKey = JSON.stringify([word, reading])` (`importWords.ts`의 `keyOf`와 같은 기준. Postgres 텍스트는 `\u0000`을 저장할 수 없어서 JSON 배열 문자열로 만든다. 공용 함수로 옮긴다)
- 기기 안의 `words.id`(`++id`)와 `progress.wordId`, `daily`의 id 배열은 그대로 숫자를 쓴다.
- 동기화 레코드로 바꿀 때만 숫자 id ↔ 단어 키로 변환한다.
  - progress: 키 = 단어 키
  - daily: `wordIds/queue/doneIds/wrongIds`(+`review`의 같은 필드)를 단어 키 배열로 바꿔서 보낸다. 받을 때 로컬에 없는 키는 배열에서 뺀다.

### 1.2 서버 (Supabase, `supabase/schema.sql`)

```sql
create table records (
  sync_code   text   not null,
  kind        text   not null check (kind in ('word','progress','daily','settings')),
  key         text   not null,
  data        jsonb,                 -- deleted면 null
  deleted     boolean not null default false,
  modified_at bigint not null,       -- 클라이언트 시각(ms). 충돌 판정용
  seq         bigint not null,       -- 서버가 매기는 증가 번호. 받기 기준값
  primary key (sync_code, kind, key)
);
create sequence records_seq;
create index on records (sync_code, seq);
alter table records enable row level security;  -- 정책 없음 = 직접 접근 불가
```

- `pull(code text, after_seq bigint, max int)` → `seq > after_seq`인 레코드를 `seq` 순서로 최대 `max`개 반환
- `push(code text, items jsonb)` → 레코드 배열을 upsert. `excluded.modified_at > records.modified_at`일 때만 덮어쓰고, 쓸 때마다 `seq = nextval('records_seq')`
  - 시작할 때 `pg_advisory_xact_lock(hashtext(code))`로 같은 코드의 push를 직렬화한다. 그래야 seq 순서와 커밋 순서가 같아서 pull이 레코드를 놓치지 않는다.
- 두 함수 모두 `security definer`, `anon` 역할에만 실행 권한. 테이블 자체는 RLS로 막는다.
- 코드 형식 검사(길이·문자)는 함수 안에서 한다.

### 1.3 로컬 DB (Dexie v4)

- `words`, `progress`, `daily`, `settings`에 `modifiedAt`(ms) 필드와 인덱스 추가
- 새 테이블
  - `tombstones`: `[kind+key]`, `modifiedAt` — 삭제를 다른 기기에 알리기 위한 기록
  - `sync`: `id`('state') — `{ code, lastSeq, lastPushedAt, lastSyncAt, lastError, lastErrorAt }`
- 마이그레이션(v4 upgrade)으로 기존 데이터의 `modifiedAt` 채우기
  - progress: `lastStudiedAt ?? 0`
  - words, daily, settings: `0`
  - 그래서 처음 합칠 때 실제 공부 기록이 우선한다.

### 1.4 modifiedAt 자동 기록 (Dexie 훅)

기존 저장 코드는 고치지 않고 훅으로 채운다.
- `creating`: 객체에 `modifiedAt`이 없으면(`== null`) `Date.now()`
- `updating`: 변경분에 `modifiedAt`이 **null이 아닌 값으로** 들어 있으면 그대로 두고, 아니면 `Date.now()`
  - 원격 레코드 적용은 원격 `modifiedAt`을 담아 `put`하므로 값이 유지된다 → 다시 올라가지 않음
  - 로컬 `update()`나 `{...old, ...}` 형태의 `put`은 `modifiedAt`이 변경분에 없으므로 현재 시각이 찍힌다
- 백업 불러오기는 예외로, 불러온 객체에서 `modifiedAt`을 지운 뒤 저장한다(→ 현재 시각, 클라우드를 백업 상태로 맞춤).

### 1.5 삭제와 키 변경
- 단어 삭제(`words.ts`): 같은 트랜잭션에서 `tombstones`에 `word`와 `progress` 키를 기록
- 단어 수정으로 `word`/`reading`이 바뀌면: 옛 키의 `word`·`progress` 삭제 기록 + 학습 기록을 현재 시각으로 갱신(새 키로 올라가게)
- 백업 불러오기: 불러오기 전에 있던 단어 중 백업에 없는 단어 키는 삭제 기록 남김

### 1.6 충돌 규칙
- 원격 레코드는 `remote.modifiedAt > max(local.modifiedAt, 같은 키 tombstone.modifiedAt)`일 때만 적용
- **예외: 하루 배정(daily)** 은 진행량(새 단어·복습의 `doneIds`+`wrongIds` 개수)이 많은 쪽을 우선하고, 같을 때만 `modifiedAt`으로 정한다.
  - 두 번째 기기가 받기 전에 학습 화면을 열면 빈 배정이 새 시각으로 만들어져 다른 기기의 진행을 덮을 수 있기 때문
  - 로컬이 더 진행돼서 원격을 거절하면 로컬의 `modifiedAt`을 현재 시각으로 갱신해 다음 보내기에서 서버도 로컬 쪽으로 맞춘다
- 원격 삭제 레코드도 같은 규칙으로 적용(로컬 단어 삭제 + 그 단어의 progress 삭제)
- 서버도 `modified_at`이 더 클 때만 덮어씀

## 2. 동기화 흐름

### 2.1 설정값
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - 로컬: `.env.local`(`.gitignore`의 `*.local`로 제외됨)
  - 배포: GitHub 저장소 Variables → `deploy.yml`의 빌드 단계 `env`로 전달
- 둘 중 하나라도 없으면 동기화 기능 전체를 끈다(설정 화면에 "동기화가 설정되지 않았어요").

### 2.2 동기화 코드
- `crypto.getRandomValues`로 16바이트 → Crockford Base32 26자 → `XXXX-XXXX-…` 형태로 표시
- 입력할 때 하이픈·공백·대소문자는 무시하고 정규화한다.

### 2.3 언제
| 시점 | 동작 |
|---|---|
| 앱 시작, `visibilitychange`로 다시 보일 때, `online` 이벤트 | 받기 → 보내기 |
| 로컬 변경 후(훅에서 알림) | 3초 디바운스 후 보내기 |
| `visibilitychange`로 숨겨질 때 | 즉시 보내기(`fetch`의 `keepalive`) |

- 동시에 두 번 돌지 않도록 한 번에 하나만 실행하고, 실행 중 요청이 오면 끝난 뒤 한 번 더 돈다.

### 2.4 받기(pull)
1. `lastSeq` 이후를 1000개씩 끝까지 받는다(전부 모은 뒤 적용).
2. 하나의 Dexie 트랜잭션에서 `word` → `progress` → `daily` → `settings` 순으로 적용(같은 kind 안에서는 seq 순). 단어가 먼저 있어야 키를 id로 바꿀 수 있다.
3. 성공하면 `lastSeq` = 받은 마지막 seq, `lastSyncAt` 갱신
- 같은 레코드를 두 번 적용해도 결과가 같다(멱등).

### 2.5 보내기(push)
1. `startedAt = Date.now()`를 먼저 잡는다.
2. 각 테이블에서 `modifiedAt > lastPushedAt`인 레코드와 tombstones를 모아 동기화 레코드로 변환
3. 500개씩 `push` 호출
4. 전부 성공하면 `lastPushedAt = startedAt`(수집 중에 생긴 변경은 다음 보내기에 포함됨)
- 원격에서 받은 레코드 중 `modifiedAt`이 `lastPushedAt`보다 큰 것은 한 번 더 올라갈 수 있지만, 서버가 같은 값이면 무시하므로 결과는 같다.

### 2.6 처음 연결
- **새 코드 만들기**: `lastPushedAt = -1`(마이그레이션으로 0이 된 레코드도 포함), `lastSeq = 0` → 보내기
- **코드 입력**
  - 이 기기에 단어가 없으면: 바로 받기
  - 단어가 있으면 시트에서 선택
    - **합치기(기본)**: 받기(LWW 적용) → `lastPushedAt = -1`로 보내기
    - **이 기기 데이터 버리고 받기**: 로컬 4개 테이블과 tombstones 비우기 → `lastPushedAt = Date.now()` → 받기
- **연결 해제**: `sync` 상태만 지운다. 로컬 데이터는 유지

### 2.7 실패 처리
- 네트워크·서버 오류는 `lastError`, `lastErrorAt`에 기록하고 다음 시점에 다시 시도. 학습 흐름은 막지 않는다.
- 상태 문구
  - 오프라인(`navigator.onLine === false` 또는 fetch 실패): "오프라인: 연결되면 맞춥니다"
  - Supabase 일시 정지(연결 거부·5xx 지속): "Supabase 프로젝트가 일시 정지됐을 수 있어요. 대시보드에서 다시 켜 주세요"
  - 코드 형식 오류(함수가 반환): "코드가 올바르지 않아요"

### 2.8 나중에 로그인 붙이기(지금은 만들지 않음)
- Supabase Auth(이메일 코드)를 켜고 `accounts(user_id, sync_code)` 테이블 추가
- `pull`/`push`가 `auth.uid()`로 코드를 찾도록 바꾸고, 기존 코드를 계정에 연결
- `records`는 그대로라 데이터 이전이 없다.

## 3. 화면

### 3.1 설정 > 동기화 (데이터 그룹 위)
- 연결 전: 설명 한 줄, [새 동기화 코드 만들기], [다른 기기의 코드 입력]
- 연결 후: 상태 배지(동기화됨/오프라인/오류), "마지막 동기화: n분 전", 코드(가려서 표시, [보기]·[복사]), [지금 동기화], [이 기기 연결 해제], "코드를 아는 사람은 기록을 볼 수 있어요" 안내
- 코드 입력과 합치기/받기 선택은 기존 `Sheet` 컴포넌트 사용
- 스타일은 기존 Settings의 group/item/row/badge를 재사용

### 3.2 홈
- 동기화 중이고 마지막 성공이 24시간 넘게 지났으면 한 줄 안내("동기화가 하루 넘게 안 됐어요 · 설정에서 확인")
- 백업 알림 띠: 동기화가 연결돼 있고 마지막 성공이 7일 이내면 숨긴다.

## 4. 파일 구성

| 파일 | 역할 |
|---|---|
| `supabase/schema.sql` | 테이블, 시퀀스, RLS, `pull`/`push` 함수, 확인용 쿼리(주석) |
| `src/lib/sync/code.ts` | 코드 생성·정규화·표시 형식 |
| `src/lib/sync/records.ts` | 로컬 객체 ↔ 동기화 레코드 변환(단어 키 변환 포함) |
| `src/lib/sync/remote.ts` | RPC 호출(`fetch`), 오류 분류 |
| `src/lib/sync/engine.ts` | pull/push/적용/처음 연결/연결 해제 |
| `src/lib/sync/scheduler.ts` | 시점(시작·가시성·online·디바운스) 관리, 단일 실행 |
| `src/db.ts` | v4 스키마·마이그레이션, modifiedAt 훅, 변경 알림 |
| `src/lib/words.ts`, `src/lib/backup.ts`, `src/lib/importWords.ts` | 삭제 기록·키 변경 처리, 백업 불러오기 처리, `wordKey` 공용화 |
| `src/pages/Settings.tsx` + `SyncSection` | 동기화 화면 |
| `src/pages/Home.tsx` | 동기화 실패 안내, 백업 띠 조건 |
| `src/main.tsx` | 스케줄러 시작 |
| `.github/workflows/deploy.yml` | 빌드 env 전달, 빌드 전 `npm test` |
| `CLAUDE.md` | "로그인/서버 없음" → "로그인 없음, 선택적 동기화(Supabase)" 등 반영 |

## 5. 테스트

`vitest`(Vite 설정 공유) + `fake-indexeddb`(Node에서 IndexedDB 대체). `remote.ts`는 메모리 가짜 서버로 바꾼다(seq·LWW 규칙을 SQL과 같게 구현).

- 레코드 변환: 단어 키 ↔ id, daily 배열 변환, 로컬에 없는 키 제거
- 훅: 로컬 변경은 현재 시각, 원격 적용은 원격 값 유지
- LWW: 더 오래된 원격은 무시, tombstone보다 오래된 원격 무시
- 두 기기 시나리오(가짜 DB 두 개 + 가짜 서버 하나)
  - A에서 채점 → B 받기 → 같은 progress/daily
  - A에서 단어 삭제 → B에서 삭제됨
  - A에서 단어 키 변경 → B에서 옛 단어 삭제, 새 단어에 학습 기록 유지
  - 처음 연결 합치기(양쪽 데이터), 버리고 받기
  - 받은 레코드가 다시 올라가지 않음(push 개수 확인)
- v4 마이그레이션 기본값

SQL 함수는 `schema.sql` 끝의 확인용 쿼리로 SQL Editor에서 확인한다. 최종 확인은 PC의 Chrome·Safari를 두 기기처럼 써서 한 뒤 아이폰 홈 화면 앱에서 한다.

## 6. 위험과 대응

| 위험 | 대응 |
|---|---|
| 무료 프로젝트 7일 미사용 시 일시 정지 | 매일 쓰면 해당 없음. 정지 시 상태 문구로 안내 |
| 기기 시계 차이로 LWW가 어긋남 | 번갈아 쓰는 전제에서 영향 작음. 받기를 먼저 하므로 대부분 회피 |
| 코드 유출 시 기록 노출 | 128비트 무작위 코드, 화면에서 가려 표시, 안내 문구 |
| 동기화 버그로 기록 손실 | 테스트, 백업 기능 유지(연결 전 백업 권장 문구) |
