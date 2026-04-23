import { useCallback, useEffect, useRef, useState } from "react";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { Toast } from "./components/shared/Toast";
import { Sidebar, type MenuId } from "./components/Sidebar";
import { GenerateTab } from "./tabs/GenerateTab";
import { EditTab } from "./tabs/EditTab";
import { ComposeTab } from "./tabs/ComposeTab";
import {
  DEFAULT_PARAMS,
  type CommonParams,
} from "./components/AdvancedOptions";
import { getApiKeyFromEnv, loadParams, saveParams } from "./lib/storage";

function AppShell() {
  const { addToast } = useToast();
  const apiKey = getApiKeyFromEnv();
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
    if (!apiKey && !missingKeyWarned.current) {
      missingKeyWarned.current = true;
      addToast(
        ".env.local에 VITE_OPENAI_API_KEY를 설정해주세요.",
        "warning",
        6000,
      );
    }
  }, [apiKey, addToast]);

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
        apiKeyPresent={apiKey.length > 0}
      />

      <main
        className={`main-content ${sidebarCollapsed ? "main-content--expanded" : ""}`}
      >
        {activeMenu === "generate" && (
          <GenerateTab
            apiKey={apiKey}
            params={params}
            onParamsChange={setParams}
            onSendToEdit={sendToEdit}
          />
        )}
        {activeMenu === "edit" && (
          <EditTab
            apiKey={apiKey}
            params={params}
            onParamsChange={setParams}
            externalRef={pendingRef}
            onConsumeExternalRef={consumePendingRef}
            onSendToEdit={sendToEdit}
          />
        )}
        {activeMenu === "compose" && (
          <ComposeTab
            apiKey={apiKey}
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
