"use client";

import React, { useRef, useEffect, useState } from "react";
import { useArchitectureStore } from "../store/architectureStore";
import { Search as SearchIcon, X, Sliders } from "lucide-react";
import { LayoutType, NodeType } from "../types";

const colorMap: Record<NodeType, string> = {
  enterprise: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  domain: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  system: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  container: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  component: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  module: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  service: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export function Search() {
  const searchQuery = useArchitectureStore((state) => state.searchQuery);
  const setSearchQuery = useArchitectureStore((state) => state.setSearchQuery);
  const getSearchResults = useArchitectureStore((state) => state.getSearchResults);
  const setPath = useArchitectureStore((state) => state.setPath);
  const selectNode = useArchitectureStore((state) => state.selectNode);

  const layoutPreference = useArchitectureStore((state) => state.layoutPreference);
  const setLayoutPreference = useArchitectureStore((state) => state.setLayoutPreference);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const results = getSearchResults();

  // Keyboard Shortcuts: '/' to search, 'ESC' to close search, 'Ctrl+F' to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close search result dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleSelect = (res: { id: string, path: string[], name: string, description?: string, type: NodeType, technology?: string }) => {
    // Navigate to parent, select node
    const parentPath = res.path.slice(0, -1);
    setPath(parentPath);
    // Delay selection slightly to allow state to settle
    setTimeout(() => {
      selectNode(res.id);
    }, 50);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 shrink-0 select-none">
      {/* Search Input Box */}
      <div className="relative w-72 lg:w-96">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
          <SearchIcon className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search architecture... (Press '/' or 'Ctrl+F')"
          className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-all shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-2.5 flex items-center text-slate-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Search Results Popover */}
        {isOpen && searchQuery && (
          <div
            ref={resultsRef}
            className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-[100] p-1.5 scrollbar-thin"
          >
            {results.length > 0 ? (
              <div className="space-y-0.5">
                {results.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => handleSelect(res)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 cursor-pointer text-xs transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-200 group-hover:text-white truncate">
                        {res.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[280px]">
                        {res.description || "No description."}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                      {res.technology && (
                        <span className="text-[8px] font-mono px-1 rounded bg-slate-950 border border-slate-800 text-slate-500">
                          {res.technology}
                        </span>
                      )}
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colorMap[res.type]}`}>
                        {res.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs italic">
                No matching elements found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Layout Option Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span>Layout:</span>
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          {(["layered", "force", "radial", "tree"] as LayoutType[]).map((layout) => (
            <button
              key={layout}
              onClick={() => setLayoutPreference(layout)}
              className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md font-semibold transition-all ${
                layoutPreference === layout
                  ? "bg-slate-800 text-sky-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {layout}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
export default Search;
