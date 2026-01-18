# Life Question Bot — Product Spec

## 1. 제품 개요 (Product Overview)
사용자가 스스로 정의한 질문 혹은 AI가 사용자의 과거 답변(Context)을 기반으로 생성한 질문을 특정 시간이나 패턴에 맞춰 알림으로 전송하고, 이에 대한 답변을 기록하여 자기 성찰을 돕는 **지능형 질문/답변 플랫폼**입니다.

## 2. 주요 기능 명세 (Functional Requirements)

### 2.1. 질문 관리 (Question Management)
- **일반 질문 (Manual Question):** 사용자가 직접 텍스트를 입력하여 생성.
- **메타 질문 (Meta Question):** AI가 질문을 생성하기 위한 프롬프트 템플릿. (예: "오늘 나의 기분에 대해 물어봐줘")
- **상태 관리:**
  - `Draft`: 작성 중. 알림 대상 아님.
  - `Publish`: 활성화됨. 스케줄링 및 알림 발송 가능.
  - `Done`: (일회성 질문의 경우) 발송 및 답변 완료됨.
  - `Archive`: 보관됨. 리스트에서 숨김 처리, 발송 제외.

### 2.2. 스케줄링 및 예약 (Scheduling & Reservation)
- **지정 시간 예약:** 특정 날짜/시간(YYYY-MM-DD HH:mm)에 1회 발송.
- **반복 스케줄:** Cron 표현식 기반 반복 (예: 매주 월요일 오전 9시).
- **AI 프롬프트 예약 (기간 단위):**
  - 입력: "이번 주 평일 일과 시간에 랜덤하게 3번 질문해줘."
  - 로직: 시스템이 해당 기간 내의 유효 시간을 계산하여 랜덤 슬롯을 생성 및 예약.

### 2.3. 답변 및 컨텍스트 (Answer & Context)
- **답변 작성:** 텍스트 입력.
- **컨텍스트 생성 (RAG 파이프라인):**
  - 사용자가 답변을 완료하면 LLM이 내용을 요약 및 정제.
  - 정제된 내용을 벡터(Vector)로 임베딩하여 저장.
- **메타 질문 생성:** 메타 질문 발송 시점, 최근 컨텍스트(Vector Search)를 참조하여 개인화된 질문 생성.

### 2.4. UX 플로우 명세 (UX Flow Spec)
본 섹션은 특정 프레임워크/프로젝트 구현에 종속되지 않는 **사용자 경험 관점의 흐름**을 정의합니다.

#### 2.4.1. IA (Information Architecture)
- **Questions**: 일반 질문(수동 작성) 목록/생성/상태 변경
- **Meta Questions**: 메타 질문(프롬프트 템플릿) 목록/생성/상태 변경
- **Reservations / Schedule**: 예약(지정/반복/AI 기간) 생성/수정/목록
- **Answer Inbox**: 최근에 받은 질문(알림)을 열고 답변
- **History**: 과거 질문/답변 조회
- **Settings**: 시간대(Timezone), 알림 채널/권한, 기타 기본 설정

#### 2.4.2. 사용자 여정 (User Journeys)

##### A. 최초 진입 / 온보딩
1. 사용자는 로그인/계정 생성 또는 익명 세션으로 진입한다.
2. 앱은 시간대(Timezone)를 수집한다(기기 감지 → 사용자 확인/수정).
3. 앱은 알림 권한 및 토큰 등록을 안내한다(허용/거부 모두 진행 가능).
4. 완료 후 기본 화면(Questions 또는 Inbox)로 이동한다.

**성공 조건**: Timezone이 저장되고, 알림 권한 상태가 명확히 표시된다.

##### B. 일반 질문 생성 → 발송 예약
1. 사용자는 Questions에서 "새 질문"을 선택한다.
2. 질문 텍스트를 입력하고 상태를 선택한다.
  - 기본값: `DRAFT` (즉시 발송 대상 아님)
3. 사용자는 예약 생성 흐름으로 이동한다.
4. 예약 타입을 선택한다.
  - `FIXED`: 특정 일시
  - `RECURRING`: Cron 기반 반복
  - `AI_GENERATED`: 기간/조건 기반 다회 예약 생성
5. 저장 후, "다음 발송 예정"과 같은 요약 정보를 사용자에게 보여준다.

**성공 조건**: 질문과 예약이 연결되어 저장되고, 사용자가 다음 발송을 예측할 수 있다.

##### C. 메타 질문 생성 → 개인화 질문 발송
1. 사용자는 Meta Questions에서 "새 메타 질문"을 선택한다.
2. 생성 지침(예: 톤/주제/형식)을 `base_prompt`로 작성한다.
3. 상태를 `PUBLISH`로 전환하거나 예약 생성으로 이동한다.
4. 예약 실행 시점에 시스템은 컨텍스트(요약 메모리)를 검색하여 LLM에 제공한다.
5. 생성된 질문 1문장을 알림으로 발송한다.
6. 생성 실패 시, 안전한 폴백(예: `base_prompt` 그대로)을 발송한다.

**성공 조건**: 컨텍스트 기반 질문이 생성되며, 실패해도 사용자 경험이 끊기지 않는다.

##### D. AI 기간 예약(자연어 → 슬롯 생성)
1. 사용자는 예약 화면에서 `AI_GENERATED`를 선택한다.
2. 자연어로 기간/횟수/제약을 입력한다.
  - 예: "이번 주 평일 업무시간에 랜덤하게 3번"
3. 시스템은 입력을 구조화(시작/끝/횟수)하고, 시간 슬롯을 생성한다.
4. 생성된 슬롯(발송 예정 리스트)을 사용자에게 미리 보여주고, 사용자는 확정/취소한다.
5. 확정 시 각 슬롯이 개별 예약으로 저장된다.

**성공 조건**: 사용자에게 “생성 결과”가 투명하게 보이고, 확정 전 검토가 가능하다.

##### E. 주간 랜덤 질문 배치(질문 풀 조회 → LLM 선택 → 배치 예약 생성)
매주 1회 질문 리스트(질문 풀)를 조회하여, LLM(또는 룰 기반 랜덤)으로 질문을 선택하고 주중/주말의 일과 시간에 랜덤하게 배치 예약을 생성하는 흐름입니다.

1. 사용자는 Reservations/Schedule 또는 Settings에서 "주간 자동 배치"를 활성화한다.
2. 사용자는 질문 풀의 범위를 지정한다.
  - 예: 일반 질문 중 `PUBLISH`만 포함, `ARCHIVE` 제외
  - (선택) 태그/키워드 포함/제외, 최근 사용(발송/답변) 질문 제외
3. 사용자는 생성 규칙을 설정한다.
  - 대상 기간: "이번 주 주중" 또는 "이번 주 주말"
  - 배치 개수: 5개 또는 10개(또는 사용자 입력)
  - 배치 시간대: 예) 09:00~18:00 (점심/회의 시간 제외 옵션)
  - 생성 주기: 매주 1회(예: 월요일 00:00), 사용자 Timezone 기준
4. 시스템은 주간 생성 시점에 질문 풀을 로드하고, 아래 중 하나로 질문을 선택한다.
  - **LLM 선택형:** 질문 풀/최근 기록을 입력으로 제공하여 이번 주에 보낼 질문 N개를 선택(중복/편향 제어)
  - **룰 기반 선택형:** LLM 없이 랜덤 샘플링(예: 최근 사용 제외)
5. 시스템은 선택된 질문 N개를 대상 기간/시간대에 랜덤 슬롯으로 배치한다(분 단위 라운딩).
6. (미리보기) 사용자는 생성될 "이번 주 예약"을 질문 + 시간으로 확인하고, 확정/취소한다.
7. 확정 시 시스템은 슬롯별로 예약 레코드를 생성한다.
  - 권장: 각 슬롯을 `FIXED` 예약으로 저장(질문 ID를 직접 연결)
  - 대안: `AI_GENERATED` 예약으로 저장하되 `ai_schedule_prompt`에 규칙을 기록(감사/재현 가능)
8. 생성 결과 요약(생성/스킵/충돌 해결)을 사용자에게 보여준다.

**성공 조건**: 매주 자동으로 예약이 생성되며, 사용자가 사전 검토/수정할 수 있다.

##### F. 알림 수신 → 답변 작성 → 저장
1. 사용자는 알림을 탭하여 앱(또는 웹)으로 진입한다.
2. Inbox/Answer 화면에서 질문 텍스트가 표시된다.
  - 메타 질문은 매회 다른 문구가 생성될 수 있으므로, 해당 시점의 질문 문구를 화면에 그대로 표시한다.
3. 사용자는 답변을 입력하고 제출한다.
4. 제출 즉시 사용자에게 저장 성공 UI(토스트/확인 화면)를 보여준다.
5. 요약/임베딩 등 AI 후처리는 비동기로 수행되며, UI를 블로킹하지 않는다.

**성공 조건**: 답변이 빠르게 저장되고, AI 후처리 실패가 사용자 입력을 훼손하지 않는다.

##### G. 기록 조회 / 개선 루프
1. 사용자는 History에서 과거 질문/답변을 조회한다.
2. 질문/메타 질문/예약의 상태를 변경하거나(Archive 등) 템플릿을 개선한다.
3. 사용자는 설정에서 시간대/알림 권한 상태를 점검한다.

#### 2.4.3. 화면 단위 요구사항 (Screen-Level Requirements)

##### Questions / Meta Questions 리스트
- 필수: 상태 필터(DRAFT/PUBLISH/DONE/ARCHIVE), 생성일 정렬
- 권장: "다음 발송 예정"(연결된 예약이 있을 때), 간단한 요약

##### Reservation 생성/편집
- `FIXED`: 날짜/시간 입력(사용자 시간대 기준), 유효성 검증
- `RECURRING`: Cron 입력 + 미리보기(다음 N회 발송 시각)
- `AI_GENERATED`: 자연어 입력 + 결과 슬롯 미리보기(확정 전)

##### Weekly Batch(주간 자동 배치) 설정
- 질문 풀 선택: 상태 포함/제외(예: PUBLISH만 포함, ARCHIVE 제외), (선택) 태그/키워드 필터
- 생성 규칙: 주중/주말, 횟수(5/10/사용자 입력), 시간 범위(예: 09:00~18:00), 제외 시간(선택)
- 선택 방식: LLM 선택형 / 룰 기반 선택형
- 미리보기: 생성될 예약 목록(질문 + 발송 시각)과 충돌/중복 표시
- 확정: 이번 주 예약 생성 + 다음 실행 시각 표시

##### Answer 작성
- 질문 문구(발송 당시 텍스트) 고정 표시
- 저장 실패 시: 로컬 보존(초안) + 재시도 UI

##### Settings
- Timezone 표시/변경
- 알림 권한 상태(허용/차단) 및 재설정 안내

#### 2.4.4. 예외/오류 UX (Edge Cases)
- **알림 권한 거부:** 앱 내 Inbox/History 중심 흐름 제공 + 권한 재요청 안내
- **푸시 채널 미설정/토큰 없음:** 발송은 스킵되지만 예약/답변 흐름은 유지(테스트 모드 제공 가능)
- **Cron 표현식 오류:** 저장 불가 + 즉시 에러 메시지 + 예시 링크 제공
- **AI 스케줄 파싱 실패:** 사용자에게 입력 수정 요청(기간/횟수 명시) + 수동 입력 대안
- **LLM 생성 실패:** 메타 질문은 폴백 문구로 발송, 답변 후처리는 재시도 큐에 적재
- **주간 자동 배치: 질문이 부족함:** 가능한 개수만 생성하거나 "질문 추가/필터 완화" 안내
- **주간 자동 배치: 질문 중복 선택:** 중복 제거 후 부족분은 재선택(LLM 재요청 또는 룰 기반 보정)
- **주간 자동 배치: 기존 예약과 충돌:** 자동 회피(재배치) 또는 충돌 슬롯만 스킵 + 스킵 사유 노출
- **주간 자동 배치: 사용자 Timezone 변경:** 다음 주 생성부터 새 Timezone 기준으로 생성(기존 예약 처리 정책은 옵션)

---

## 3. 데이터베이스 스키마 (Database Schema)
RDBMS(PostgreSQL 권장)와 Vector Store(pgvector 또는 Pinecone)를 혼합하여 사용합니다.

### 3.1. Users (사용자)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `email` | VARCHAR | 계정 |
| `timezone` | VARCHAR | 알림 발송 기준 시간대 (예: Asia/Seoul) |

### 3.2. Questions (정적 질문)
사용자가 직접 작성한 고정 질문입니다.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | FK |
| `content` | TEXT | 질문 내용 |
| `status` | ENUM | 'DRAFT', 'PUBLISH', 'DONE', 'ARCHIVE' |
| `created_at` | TIMESTAMP | 생성일 |

### 3.3. MetaQuestions (메타 질문 / 프롬프트)
LLM이 질문을 생성하기 위한 지침입니다.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | FK |
| `base_prompt` | TEXT | 시스템 프롬프트 (예: "사용자를 격려하는 톤으로...") |
| `topic_tags` | JSONB | 관심 주제 (예: ["커리어", "건강"]) |
| `status` | ENUM | 'DRAFT', 'PUBLISH', 'ARCHIVE' |

### 3.4. QuestionReservations (질문 예약)
알림이 발송될 스케줄을 정의합니다. `question_id`와 `meta_question_id` 중 하나는 반드시 존재해야 합니다.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | FK |
| `question_id` | UUID | FK (Nullable), 일반 질문 연결 |
| `meta_question_id` | UUID | FK (Nullable), 메타 질문 연결 |
| `type` | ENUM | 'FIXED'(지정), 'RECURRING'(반복), 'AI_GENERATED'(기간랜덤) |
| `target_time` | TIMESTAMP | FIXED, AI_GENERATED일 경우 발송 예정 시간 |
| `cron_expression` | VARCHAR | RECURRING일 경우 반복 규칙 |
| `ai_schedule_prompt` | TEXT | AI_GENERATED일 경우 조건 (예: "주말 제외, 오후 2~5시 사이") |
| `is_processed` | BOOLEAN | 발송 처리 여부 (반복일 경우 실행 로그는 별도 관리) |

### 3.5. Answers (답변)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | FK |
| `source_question_text` | TEXT | 당시 발송된 질문 내용 (Meta 질문의 경우 매번 다르므로 저장 필수) |
| `answer_content` | TEXT | 사용자 답변 |
| `answered_at` | TIMESTAMP | 답변 시간 |

### 3.6. QuestionContexts (질문 컨텍스트 / 메모리)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | FK |
| `answer_id` | UUID | FK (1:1 관계), 원본 답변 연결 |
| `summary` | TEXT | LLM이 요약한 핵심 정보 |
| `embedding` | VECTOR(1536) or JSON | 요약 내용의 임베딩 값 (검색용). 벡터 확장 미사용 시 JSON 저장 |
| `created_at` | TIMESTAMP | |

### 3.7. Jobs (비동기 작업 큐)
간단한 비동기 처리(요약/임베딩)를 위한 DB 기반 잡 테이블입니다.
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `user_id` | UUID | FK |
| `type` | VARCHAR | 작업 유형 (예: SUMMARIZE_EMBED) |
| `payload` | JSON | 작업 데이터 |
| `status` | ENUM | 'PENDING', 'RUNNING', 'DONE', 'FAILED' |
| `run_at` | TIMESTAMP | 실행 예정 시각 |
| `attempts` | INT | 재시도 횟수 |
| `last_error` | TEXT | 마지막 오류 메시지 |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

## 4. 핵심 비즈니스 로직 및 구현 규칙 (Development Rules)

### 4.1. 스케줄링 및 알림 발송 로직
시스템은 1분 단위(또는 적절한 주기)로 `QuestionReservations` 테이블을 스캔합니다.

1. **발송 대상 선정:**
  - `target_time`이 현재 시간 범위(예: $[now, now+60s)$)에 도달한 `FIXED` 또는 `AI_GENERATED` 예약.
  - `cron_expression`이 현재 시간과 일치하는 `RECURRING` 예약.
  - 반복 예약은 사용자 시간대 기준으로 Cron을 계산.
2. **질문 내용 결정 (Payload Generation):**
  - **일반 질문:** `Questions.content`를 그대로 사용.
  - **메타 질문:**
    1. Vector 검색이 가능할 경우 `QuestionContexts`에서 관련도 상위 컨텍스트를 조회.
    2. `base_prompt` + `Retrieved Context`로 LLM을 호출하여 질문 생성.
    3. LLM 오류 시 `base_prompt`를 그대로 질문으로 사용(폴백).
3. **알림 발송 (Push Notification):** 구성된 푸시 채널(예: FCM/APNS/Web Push)로 발송.
  - 푸시 설정이 없으면 안전하게 스킵 가능.
4. **상태 업데이트:**
  - `FIXED` 예약은 `is_processed = true`로 변경.
  - `FIXED` 예약에 연결된 일반 질문은 `DONE`으로 변경.

### 4.2. AI 예약 생성 로직 (Prompt to Schedule)
사용자가 "이번 주에 3번 질문해줘"라고 입력했을 때의 처리 과정입니다.

1. **입력 파싱:** LLM을 사용하여 자연어 입력을 구조화된 데이터로 변환.
   - *Input:* "내일 오후에 2번"
   - *Output:* `Start: Tomorrow 12:00`, `End: Tomorrow 18:00`, `Count: 2`
2. **슬롯 할당:** 시간 범위 내에서 랜덤하게 `Count` 만큼의 `target_time`을 계산.
  - 분 단위로 라운딩하여 알림 시각을 표준화.
  - 랜덤 슬롯이 부족하면 균등 분할로 보정.
3. **데이터 저장:** 계산된 시간만큼 `QuestionReservations`에 `type='AI_GENERATED'`로 레코드 생성.

### 4.3. 컨텍스트 생성 및 벡터 임베딩 (Post-Answer Process)
답변이 저장(`Answers` Insert)된 직후 비동기 작업(Queue)으로 처리합니다.

1. **요약 (Summarization):**
   - *Prompt:* "다음 질문과 답변을 보고, 사용자에 대한 핵심 사실이나 감정 상태를 3문장 이내의 평서문으로 요약해. 추후 질문 생성에 참고할 메모리야."
   - *Input:* (질문) "요즘 가장 큰 고민이 뭐야?", (답변) "이직 준비 중인데 면접이 너무 떨려."
   - *Output:* "사용자는 현재 이직을 준비 중이다. 면접에 대한 불안감과 긴장감을 느끼고 있다."
2. **임베딩 (Embedding):**
  - 임베딩 모델을 사용하여 요약본을 벡터화.
3. **저장:** `QuestionContexts` 테이블에 요약 텍스트와 벡터 저장.
  - 벡터 확장이 없는 환경에서는 JSON 컬럼에 저장하고 검색은 스텁/대체 구현 가능.
4. **작업 큐 처리:**
  - 작업은 DB 기반 큐로 적재 후 워커가 `PENDING`을 처리.
  - 실패 시 재시도(예: 최대 3회) 후 `FAILED`로 전환.

---

## 5. 시스템 아키텍처 및 구현 참고 (프로젝트 비특화)

- **API 레이어:** HTTP 기반 엔드포인트로 질문/답변/예약 CRUD 및 스케줄러 실행 제공
  - 서버리스, 컨테이너, 또는 백엔드 프레임워크 어느 방식이든 대체 가능
- **스케줄러:**
  - 외부 크론(또는 플랫폼 스케줄러)이 주기적으로 스캔 엔드포인트를 호출
  - 별도 워커 엔드포인트로 비동기 잡 처리 가능
- **Database:** 관계형 DB + (선택) 벡터 확장
  - 벡터 확장이 없을 경우 JSON 저장 후 검색 로직을 대체/스텁 처리 가능
- **Job Queue:**
  - 초기 단계에서는 DB 기반 큐로 충분
  - 필요 시 Redis/Celery/BullMQ 등으로 대체 가능
- **Push 알림:**
  - FCM/APNS/Web Push 등으로 추상화
  - 설정 미비 시 안전하게 스킵하도록 구성
- **LLM Provider:**
  - 질문 생성/요약/스케줄 파싱을 위한 텍스트 생성 모델
  - 임베딩 모델은 요약 텍스트의 벡터화를 담당

## 6. 개발 단계별 체크리스트 (Implementation Plan)

### Phase 0: 디자인 (Design)
- [x] 디자인 시스템 정의 (컬러, 타이포, 간격, 아이콘)
- [x] 핵심 화면 설계 (질문 리스트, 질문 작성, 답변 작성, 예약 설정, 알림 히스토리)
- [x] 공통 컴포넌트 설계 (버튼, 입력, 카드, 태그, 모달, 토스트)

### Phase 1: 기본 구조 (Skeleton)
- [x] DB 스키마 생성 (Users, Questions, Answers, Reservations, Contexts)
- [x] 일반 질문 CRUD API 구현
- [x] 메타 질문 CRUD API 구현
- [x] 예약 CRUD API 구현
- [x] 답변 등록 + 비동기 요약/임베딩 큐 연결
- [x] 푸시 발송 경로 연결 (설정 없을 경우 스킵)

### Phase 2: 스케줄러 구현
- [x] QuestionReservations 테이블 연동
- [x] 1분 단위 스캐너 엔드포인트 구현
- [x] 지정 시간(`FIXED`) 알림 발송 로직 구현
- [x] 반복(`RECURRING`) 크론 매칭 처리

### Phase 3: AI 및 컨텍스트 (Core Value)
- [~] Vector DB 연동 (벡터 확장 미사용 환경은 스텁 처리)
- [x] 답변 등록 시 요약 -> 임베딩 -> 저장 파이프라인(Worker) 구현
- [x] MetaQuestion 테이블 및 LLM 연동 (RAG: 검색 -> 프롬프트 -> 질문생성)
- [x] AI 기간 예약 알고리즘 구현 (자연어 -> 시간 슬롯 계산)

### Phase 4: 안정화
- [~] 사용자별 Timezone 처리 검증
- [x] LLM 응답 실패 시 Fallback 로직 (기본 질문 발송 등) 구현
