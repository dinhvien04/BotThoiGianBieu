"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { typeColors, typeLabels } from "@/lib/mock-data";
import { getSchedules, type Schedule } from "@/lib/api";
import { ListSkeleton } from "@/components/dashboard/SkeletonLoader";
import { DataLoadError } from "@/components/dashboard/ErrorStates";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce 300ms để không gọi API mỗi keystroke
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setItems([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getSchedules({ search: trimmed, limit: 50 });
        if (!ctrl.signal.aborted) {
          setItems(res.items ?? []);
        }
      } catch (err) {
        if (!ctrl.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // Filter client-side theo type sau khi đã có items từ API
  const results = useMemo(
    () =>
      typeFilter === "all"
        ? items
        : items.filter((s) => s.item_type === typeFilter),
    [items, typeFilter],
  );

  const types = useMemo(
    () => Array.from(new Set(items.map((s) => s.item_type))),
    [items],
  );

  const retry = () => setQuery((q) => q + ""); // trigger effect

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Tìm kiếm lịch trình</h1>

      {/* Search input */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nhập từ khóa tìm kiếm..."
          className="w-full pl-12 pr-4 py-3.5 border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === "all" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
        >
          Tất cả
        </button>
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${typeFilter === type ? "text-on-primary" : "text-on-surface-variant bg-surface-container"}`}
            style={typeFilter === type ? { backgroundColor: typeColors[type] } : undefined}
          >
            {typeLabels[type]}
          </button>
        ))}
      </div>

      {/* Results */}
      {query.trim() && !loading && !error && (
        <p className="text-sm text-on-surface-variant">
          Tìm thấy <span className="font-bold text-on-surface">{results.length}</span> kết quả cho &ldquo;{query}&rdquo;
        </p>
      )}

      {error && <DataLoadError onRetry={retry} />}
      {loading && <ListSkeleton rows={3} />}

      {!loading && !error && results.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-surface-container-high">
          {results.map((s) => (
            <Link
              key={s.id}
              href={`/lich/${s.id}`}
              className="flex items-center gap-4 p-4 hover:bg-surface-container-low transition-colors"
            >
              <div
                className="w-1.5 h-14 rounded-full shrink-0"
                style={{ backgroundColor: typeColors[s.item_type] || "#6750A4" }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-on-surface">{s.title}</p>
                {s.description && (
                  <p className="text-sm text-on-surface-variant mt-0.5 truncate">{s.description}</p>
                )}
                <p className="text-xs text-on-surface-variant/60 mt-1">
                  {new Date(s.start_time).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  {" • "}
                  {new Date(s.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-on-primary shrink-0"
                style={{ backgroundColor: typeColors[s.item_type] || "#6750A4" }}
              >
                {typeLabels[s.item_type] ?? s.item_type}
              </span>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && query.trim() && results.length === 0 && (
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm text-center">
          <svg className="w-16 h-16 text-on-surface-variant/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="text-on-surface font-medium">Không tìm thấy kết quả</p>
          <p className="text-sm text-on-surface-variant mt-1">Thử tìm với từ khóa khác hoặc bỏ bộ lọc.</p>
        </div>
      )}

      {!query.trim() && (
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-sm text-center">
          <svg className="w-16 h-16 text-on-surface-variant/20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="text-on-surface font-medium">Tìm kiếm lịch trình</p>
          <p className="text-sm text-on-surface-variant mt-1">Nhập từ khóa để tìm sự kiện, cuộc họp, công việc...</p>
        </div>
      )}
    </div>
  );
}
