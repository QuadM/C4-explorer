"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useArchitectureStore } from "@/store/architectureStore";
import { Search } from "@/components/Search";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Sidebar } from "@/components/Sidebar";
import { SidePanel } from "@/components/SidePanel";
import { GraphCanvas } from "@/features/graph/GraphCanvas";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { sampleArchitecture } from "@/data/sampleData";

export default function ArchitecturePage() {
  const params = useParams();
  const router = useRouter();
  const importData = useArchitectureStore((s) => s.importData);
  const setPath = useArchitectureStore((s) => s.setPath);
  const flatNodes = useArchitectureStore((s) => s.flatNodes);
  const rootNode = useArchitectureStore((s) => s.rootNode);
  const currentPath = useArchitectureStore((s) => s.currentPath);

  // Register global keyboard shortcuts
  useKeyboardShortcuts();

  // Load sample data on first mount
  useEffect(() => {
    if (!rootNode) {
      importData(sampleArchitecture);
    }
  }, [rootNode, importData]);

  // Sync URL path → Zustand store when navigating via browser back/forward
  useEffect(() => {
    if (!rootNode) return;
    const pathSegments = params.path as string[] | undefined;
    if (!pathSegments || pathSegments.length === 0) {
      setPath([]);
      return;
    }
    // Validate each segment exists in the flat map
    const valid = pathSegments.every((id) => flatNodes.has(id));
    if (valid) {
      setPath(pathSegments);
    } else {
      setPath([]);
    }
  }, [params.path, rootNode, flatNodes, setPath]);

  // Sync Zustand store path → URL (push to browser history)
  useEffect(() => {
    if (!rootNode) return;
    const urlPath =
      currentPath.length === 0
        ? "/architecture"
        : `/architecture/${currentPath.join("/")}`;
    const currentUrl = window.location.pathname;
    if (currentUrl !== urlPath) {
      router.push(urlPath, { scroll: false });
    }
  }, [currentPath, rootNode, router]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-white">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Canvas Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Top toolbar: Search + Layout selector */}
        <Search />

        {/* Breadcrumbs trail */}
        <Breadcrumbs />

        {/* Graph canvas — fills all remaining space */}
        <div className="flex-1 min-h-0 relative">
          <GraphCanvas />
        </div>
      </div>

      {/* Right Side Panel */}
      <SidePanel />
    </div>
  );
}
