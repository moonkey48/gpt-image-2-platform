import { ApiKeyStatus, type KeyStatus } from "./ApiKeyStatus";

export type MenuId = "generate" | "edit" | "compose";

export interface MenuItem {
  id: MenuId;
  label: string;
  icon: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "generate", label: "텍스트로 이미지 생성", icon: "✨" },
  { id: "edit", label: "이미지 편집", icon: "🎨" },
  { id: "compose", label: "다중 이미지 합성", icon: "🖼️" },
];

interface Props {
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
  collapsed: boolean;
  onToggle: () => void;
  keyStatus: KeyStatus;
}

export function Sidebar({
  activeMenu,
  onMenuChange,
  collapsed,
  onToggle,
  keyStatus,
}: Props) {
  return (
    <>
      <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">GPT 이미지 스튜디오</h1>
          <p className="sidebar-subtitle">OpenAI 이미지 생성 · 편집 · 합성</p>
        </div>

        <nav className="sidebar-nav">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeMenu === item.id ? "active" : ""}`}
              onClick={() => onMenuChange(item.id)}
              data-tooltip={item.label}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <ApiKeyStatus status={keyStatus} />

        <div className="sidebar-footer">
          <p>로컬 테스트 도구</p>
          <p>요청은 api.openai.com으로 프록시됩니다</p>
        </div>
      </aside>

      <button
        type="button"
        className={`sidebar-toggle ${collapsed ? "sidebar-toggle--collapsed" : ""}`}
        onClick={onToggle}
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
      >
        {collapsed ? "▶" : "◀"}
      </button>
    </>
  );
}
