import { useCallback, useEffect, useRef, useState } from "react";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { Toast } from "./components/shared/Toast";
import { Sidebar, type MenuId } from "./components/Sidebar";
import type { KeyStatus } from "./components/ApiKeyStatus";
import { GenerateTab } from "./tabs/GenerateTab";
import { EditTab } from "./tabs/EditTab";
import { ComposeTab } from "./tabs/ComposeTab";
import {
  DEFAULT_PARAMS,
  type CommonParams,
} from "./components/AdvancedOptions";
import { fetchKeyStatus, loadParams, saveParams } from "./lib/storage";

function AppShell() {
  const { addToast } = useToast();
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("loading");
  const [activeMenu, setActiveMenu] = useState<MenuId>("generate");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [params, setParams] = useState<CommonParams>(() =>
    loadParams<CommonParams>(DEFAULT_PARAMS),
  );
  const [pendingRef, setPendingRef] = useState<File | null>(null);

  useEffect(() => {
    saveParams(params);
  }, [params]);

  const missingKeyWarned = useRef(false);
  useEffect(() => {
    let cancelled = false;
    fetchKeyStatus().then((configured) => {
      if (cancelled) return;
      setKeyStatus(configured ? "ok" : "missing");
      if (!configured && !missingKeyWarned.current) {
        missingKeyWarned.current = true;
        addToast(
          "서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. Vercel 환경 변수를 확인해주세요.",
          "warning",
          6000,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const sendToEdit = useCallback((file: File) => {
    setPendingRef(file);
    setActiveMenu("edit");
  }, []);

  const consumePendingRef = useCallback(() => {
    setPendingRef(null);
  }, []);

  return (
    <div className="app-container">
      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        keyStatus={keyStatus}
      />

      <main
        className={`main-content ${sidebarCollapsed ? "main-content--expanded" : ""}`}
      >
        {activeMenu === "generate" && (
          <GenerateTab
            params={params}
            onParamsChange={setParams}
            onSendToEdit={sendToEdit}
          />
        )}
        {activeMenu === "edit" && (
          <EditTab
            params={params}
            onParamsChange={setParams}
            externalRef={pendingRef}
            onConsumeExternalRef={consumePendingRef}
            onSendToEdit={sendToEdit}
          />
        )}
        {activeMenu === "compose" && (
          <ComposeTab
            params={params}
            onParamsChange={setParams}
            externalRef={pendingRef}
            onConsumeExternalRef={consumePendingRef}
            onSendToEdit={sendToEdit}
          />
        )}
      </main>

      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
