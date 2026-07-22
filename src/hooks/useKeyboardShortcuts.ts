"use client";

import { useEffect } from "react";
import { useArchitectureStore } from "../store/architectureStore";

/**
 * Registers global keyboard shortcuts for the architecture explorer.
 *
 * Shortcuts:
 *  - ESC          → Deselect node / close side panel
 *  - Backspace    → Navigate up one level
 *  - Enter        → Drill down into selected node
 */
export function useKeyboardShortcuts() {
  const selectedNodeId = useArchitectureStore((s) => s.selectedNodeId);
  const selectNode = useArchitectureStore((s) => s.selectNode);
  const drillDown = useArchitectureStore((s) => s.drillDown);
  const navigateUp = useArchitectureStore((s) => s.navigateUp);
  const getNodeById = useArchitectureStore((s) => s.getNodeById);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Don't fire shortcuts when user is typing in an input
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "Escape":
          selectNode(null);
          break;

        case "Backspace":
          e.preventDefault();
          navigateUp();
          break;

        case "Enter":
          if (selectedNodeId) {
            const node = getNodeById(selectedNodeId);
            if (node?.children && node.children.length > 0) {
              drillDown(selectedNodeId);
            }
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, selectNode, drillDown, navigateUp, getNodeById]);
}
