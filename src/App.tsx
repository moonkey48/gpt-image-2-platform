import { useCallback, useEffect, useState } from "react";
import { ToastProvider } from "./contexts/ToastContext";
import { Toast } from "./components/shared/Toast";
import { Sidebar, type MenuId } from "./components/Sidebar";
import { GenerateTab } from "./tabs/GenerateTab";
import { EditTab } from "./tabs/EditTab";
import { ComposeTab } from "./tabs/ComposeTab";
import {
  DEFAULT_PARAMS,
  type CommonParams,
} from "./components/AdvancedOptions";
import { loadKey, loadParams, saveKey, saveParams } from "./lib/storage";

function AppShell() {
  const [apiKey, setApiKey] = useState<string>(() => loadKey());
  const [activeMenu, setActiveMenu] = useState<MenuId>("generate");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [params, setParams] = useState<CommonParams>(() =>
    loadParams<CommonParams>(DEFAULT_PARAMS),
  );
  const [pendingRef, setPendingRef] = useState<File | null>(null);

  useEffect(() => {
    saveKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    saveParams(params);
  }, [params]);

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
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
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
