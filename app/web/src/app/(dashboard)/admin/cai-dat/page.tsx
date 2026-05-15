"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminGetSettings,
  adminSetSetting,
  type SystemSettingsMap,
} from "@/lib/api";

const KNOWN_KEYS = [
  {
    key: "bot_enabled",
    label: "Bật bot Mezon",
    type: "boolean" as const,
    description: "Tắt để tạm dừng bot xử lý lệnh.",
  },
  {
    key: "signup_enabled",
    label: "Cho phép đăng ký mới",
    type: "boolean" as const,
    description: "Khi tắt, user mới không thể khởi tạo tài khoản.",
  },
  {
    key: "site_banner",
    label: "Banner thông báo toàn site",
    type: "string" as const,
    description:
      "Để rỗng để ẩn banner. Nhập nội dung để hiển thị banner cảnh báo / thông tin.",
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettingsMap>({});
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetSettings();
      setSettings(res.settings);
      setDrafts(res.settings);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (key: string) => {
    setSavingKey(key);
    setError(null);
    setInfo(null);
    try {
      let value = drafts[key];
      const meta = KNOWN_KEYS.find((k) => k.key === key);
      if (meta?.type === "boolean" && typeof value !== "boolean") {
        value = Boolean(value);
      }
      const res = await adminSetSetting(key, value);
      setSettings((s) => ({ ...s, [key]: res.setting.value }));
      setInfo(`Đã lưu "${key}".`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Cấu hình hệ thống</h1>
        <p className="text-sm text-gray-500">
          Các giá trị key-value lưu ở bảng <code>system_settings</code>.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-700 text-sm">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-green-700 text-sm">
          {info}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Đang tải…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {KNOWN_KEYS.map((meta) => {
            const currentRaw = settings[meta.key];
            const draftRaw = drafts[meta.key];
            const isDirty =
              JSON.stringify(currentRaw ?? null) !==
              JSON.stringify(draftRaw ?? null);
            return (
              <div
                key={meta.key}
                className="rounded-2xl border border-outline-variant bg-surface p-4 space-y-2"
              >
                <div>
                  <p className="font-medium">{meta.label}</p>
                  <p className="text-xs text-gray-500">{meta.description}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{meta.key}</p>
                </div>

                {meta.type === "boolean" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(draftRaw)}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [meta.key]: e.target.checked }))
                      }
                    />
                    Bật
                  </label>
                ) : (
                  <input
                    type="text"
                    value={typeof draftRaw === "string" ? draftRaw : ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [meta.key]: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-surface"
                    placeholder="(để trống để ẩn)"
                  />
                )}

                <div className="flex items-center justify-end gap-2 text-xs">
                  <span className="text-gray-500">
                    Hiện tại:{" "}
                    <code>
                      {JSON.stringify(currentRaw ?? null)}
                    </code>
                  </span>
                  <button
                    type="button"
                    disabled={!isDirty || savingKey === meta.key}
                    onClick={() => save(meta.key)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50"
                  >
                    {savingKey === meta.key ? "Đang lưu…" : "Lưu"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
