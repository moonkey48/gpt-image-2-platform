import { ApiKeyField } from "./ApiKeyField";

export type MenuId = "generate" | "edit" | "compose";

export interface MenuItem {
  id: MenuId;
  label: string;
  icon: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "generate", label: "Generate", icon: "✨" },
  { id: "edit", label: "Edit image", icon: "🎨" },
  { id: "compose", label: "Compose images", icon: "🖼️" },
];

interface Props {
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
  collapsed: boolean;
  onToggle: () => void;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
}

export function Sidebar({
  activeMenu,
  onMenuChange,
  collapsed,
  onToggle,
  apiKey,
  onApiKeyChange,
}: Props) {
  return (
    <>
      <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">GPT Image Test</h1>
          <p className="sidebar-subtitle">OpenAI image generation</p>
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

        <ApiKeyField value={apiKey} onChange={onApiKeyChange} />

        <div className="sidebar-footer">
          <p>Local test tool</p>
          <p>Requests proxied to api.openai.com</p>
        </div>
      </aside>

      <button
        type="button"
        className={`sidebar-toggle ${collapsed ? "sidebar-toggle--collapsed" : ""}`}
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "▶" : "◀"}
      </button>
    </>
  );
}
