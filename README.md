# GPT 이미지 스튜디오

OpenAI `gpt-image-2` 모델을 로컬에서 테스트하기 위한 React + Vite 애플리케이션입니다.
텍스트로 이미지 생성 · 이미지 편집 · 다중 이미지 합성을 하나의 UI에서 다룰 수 있습니다.

## 주요 기능

- **텍스트로 이미지 생성** — 프롬프트만으로 이미지를 생성합니다.
- **이미지 편집** — 단일 이미지에 마스크(선택)와 편집 지시사항을 적용합니다.
- **다중 이미지 합성** — 최대 10장의 참조 이미지를 하나의 결과로 합성합니다.
- **스트리밍 진행률** — `n=1`씩 반복 호출하며 `(현재/전체)` 진행 상태를 실시간으로 보여줍니다.
- **결과 재활용** — 생성된 이미지를 "참조로 사용" 버튼 한 번에 편집 탭의 입력으로 전환합니다.
- **로컬 전용 프록시** — Vite 개발 서버가 `/api/openai`를 `api.openai.com`으로 프록시해 CORS 없이 브라우저에서 바로 호출합니다.

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env.local은 .gitignore에 포함되어 있습니다)
cp .env.example .env.local
# .env.local을 열고 VITE_OPENAI_API_KEY에 실제 API 키를 입력하세요.

# 3. 개발 서버 실행 (포트 5176)
npm run dev
```

브라우저에서 <http://localhost:5176/> 에 접속하세요. 사이드바 하단에 API 키 상태가 표시되며,
키가 누락된 경우 경고 토스트가 표시됩니다.

## 빌드

```bash
npm run build    # TypeScript 체크 + Vite 프로덕션 번들
npm run preview  # dist/ 미리보기
```

## 프로젝트 구조

```
src/
├── App.tsx                      # 앱 셸, 라우팅, 환경 변수 로딩
├── contexts/ToastContext.tsx    # 토스트 알림 프로바이더
├── hooks/useKeyboardShortcut.ts # ⌘+Enter 단축키 훅
├── lib/
│   ├── openai.ts                # OpenAI API 클라이언트 + 배치 헬퍼
│   ├── image-utils.ts           # 다운로드 · 참조 변환 유틸
│   └── storage.ts               # env 키 로더, 파라미터 영속화
├── components/
│   ├── Sidebar.tsx              # 사이드바 + API 키 상태
│   ├── ImageUpload.tsx          # 단일 이미지 업로드
│   ├── MultiImageUpload.tsx     # 다중 이미지 업로드 (드래그, 순서 변경)
│   ├── CountSlider.tsx          # 생성 개수 슬라이더
│   ├── AdvancedOptions.tsx      # 고급 옵션 (모델, 비율, 화질 등)
│   └── shared/                  # Toast, ProgressBar, EmptyPreview 등
├── tabs/
│   ├── GenerateTab.tsx
│   ├── EditTab.tsx
│   └── ComposeTab.tsx
└── styles/                      # bcave 영감의 라이트 모드 CSS
```

## 보안 주의

`VITE_*` 접두 환경 변수는 Vite 번들에 그대로 포함되므로 API 키는 클라이언트에
노출됩니다. 이 프로젝트는 로컬 테스트 도구를 위한 것이며, 배포 시에는 반드시
서버를 두고 키를 보관하세요.
