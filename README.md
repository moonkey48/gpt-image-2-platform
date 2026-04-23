# GPT 이미지 스튜디오

OpenAI `gpt-image-2` 모델을 테스트하기 위한 React + Vite + Vercel 애플리케이션입니다.
텍스트로 이미지 생성 · 이미지 편집 · 다중 이미지 합성을 하나의 UI에서 다룰 수 있습니다.

## 주요 기능

- **텍스트로 이미지 생성** — 프롬프트만으로 이미지를 생성합니다.
- **이미지 편집** — 단일 이미지에 마스크(선택)와 편집 지시사항을 적용합니다.
- **다중 이미지 합성** — 최대 10장의 참조 이미지를 하나의 결과로 합성합니다.
- **스트리밍 진행률** — `n=1`씩 반복 호출하며 `(현재/전체)` 진행 상태를 실시간으로 보여줍니다.
- **결과 재활용** — 생성된 이미지를 "참조로 사용" 버튼 한 번에 편집 탭의 입력으로 전환합니다.
- **서버 전용 API 키** — 개발은 Vite 프록시, 배포는 Vercel 서버리스 함수가 `/api/openai/*`
  요청에 Authorization 헤더를 서버 측에서 주입합니다. **API 키는 절대 클라이언트로
  노출되지 않습니다.**

## 아키텍처

```
Browser (apiKey 없음)
    │  fetch("/api/openai/v1/images/generations", { body })
    ▼
┌──────────────────┬────────────────────────┐
│  Local dev       │  Vercel production      │
│  (vite.config.ts)│  (api/openai/[...])     │
│  proxy +         │  serverless function    │
│  Authorization   │  + Authorization        │
│  주입            │  주입                   │
└────────┬─────────┴────────┬────────────────┘
         ▼                  ▼
      api.openai.com
```

## 빠른 시작 (로컬 개발)

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env.local은 git-ignored)
cp .env.example .env.local
# .env.local을 열고 OPENAI_API_KEY에 실제 키를 입력하세요.

# 3. 개발 서버 실행 (포트 5176)
npm run dev
```

브라우저에서 <http://localhost:5176/> 에 접속하세요. 사이드바 하단에 키 상태
(초록 ● 설정됨 / 빨간 ⚠ 미설정)가 표시됩니다.

## Vercel 배포

1. Vercel 대시보드에서 프로젝트의 **Environment Variables**에 아래 항목을 추가합니다.

   | Name | Value | Environments |
   | --- | --- | --- |
   | `OPENAI_API_KEY` | `sk-...` | Production / Preview / Development 모두 체크 |

2. 저장 후 **Redeploy**를 클릭해 새 빌드를 만들어야 서버리스 함수가 환경 변수를 읽어
   들입니다. (환경 변수만 추가하고 재배포하지 않으면 적용되지 않습니다.)

3. `VITE_OPENAI_API_KEY`라는 이름으로 기존에 추가되어 있다면 **삭제**하세요.
   `VITE_*` 접두는 클라이언트 번들에 공개되므로 사용하지 않습니다.

## 빌드

```bash
npm run build    # tsc -b (app + node + api) + Vite 프로덕션 번들
npm run preview  # dist/ 미리보기
```

## 프로젝트 구조

```
api/
├── openai/[...path].ts    # Vercel 서버리스 프록시 (Node.js runtime)
└── _status.ts             # API 키 설정 여부 반환
src/
├── App.tsx                      # 앱 셸 + 키 상태 폴링
├── contexts/ToastContext.tsx    # 토스트 알림 프로바이더
├── hooks/useKeyboardShortcut.ts # ⌘+Enter 단축키 훅
├── lib/
│   ├── openai.ts                # OpenAI API 클라이언트 + 배치 헬퍼
│   ├── image-utils.ts           # 다운로드 · 참조 변환 유틸
│   └── storage.ts               # fetchKeyStatus, 파라미터 영속화
├── components/
│   ├── Sidebar.tsx, ApiKeyStatus.tsx, ImageUpload.tsx,
│   │   MultiImageUpload.tsx, CountSlider.tsx, AdvancedOptions.tsx
│   └── shared/                  # Toast, ProgressBar, EmptyPreview, …
├── tabs/GenerateTab.tsx, EditTab.tsx, ComposeTab.tsx
└── styles/                      # bcave 영감의 라이트 모드 CSS
vite.config.ts                   # 개발 프록시 + 서버측 Authorization 주입
```

## 보안 설계

- 브라우저 번들에는 API 키가 포함되지 않습니다.
- 로컬 개발: `OPENAI_API_KEY`를 `vite.config.ts`의 `loadEnv`로만 읽어 프록시에서 주입.
- 배포: 서버리스 함수(`api/openai/[...path].ts`)가 `process.env.OPENAI_API_KEY`를
  서버 측에서 읽어 Authorization 헤더로 첨부.
- `/api/_status`는 `{ configured: boolean }`만 반환하며, 키 값 자체는 노출하지 않습니다.
