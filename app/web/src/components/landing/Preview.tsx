export default function Preview() {
  return (
    <section
      id="preview"
      aria-labelledby="preview-heading"
      className="py-20 sm:py-24 lg:py-32 bg-lp-surface-container-low"
    >
      <h2 id="preview-heading" className="sr-only">
        Giao diện sản phẩm
      </h2>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Web Dashboard preview */}
          <div className="glass-card rounded-2xl overflow-hidden flex flex-col hover-lift">
            <div className="p-5 sm:p-6 bg-lp-surface-container/50 border-b border-lp-outline-variant/30">
              <h3 className="text-xl font-semibold text-lp-primary">
                Web Dashboard
              </h3>
              <p className="text-lp-on-surface-variant text-sm">
                Giao diện tập trung dành cho quản trị viên.
              </p>
            </div>
            <div className="p-5 sm:p-6 bg-lp-bg/40 flex-1">
              <div className="rounded-xl border border-lp-outline-variant/30 bg-lp-surface-container shadow-2xl overflow-hidden">
                {/* Mock dashboard */}
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-lp-error" />
                      <div className="w-2.5 h-2.5 rounded-full bg-lp-tertiary" />
                      <div className="w-2.5 h-2.5 rounded-full bg-lp-primary" />
                    </div>
                    <div className="h-2 w-24 bg-lp-outline-variant/40 rounded" />
                    <div className="w-6" />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-14 space-y-2">
                      <div className="h-2 bg-lp-primary/30 rounded" />
                      <div className="h-2 bg-lp-outline-variant/30 rounded" />
                      <div className="h-2 bg-lp-outline-variant/30 rounded" />
                      <div className="h-2 bg-lp-outline-variant/30 rounded" />
                    </div>
                    <div className="flex-1 grid grid-cols-7 gap-1">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div
                          key={`h-${i}`}
                          className="h-1.5 bg-lp-outline-variant/30 rounded"
                        />
                      ))}
                      {Array.from({ length: 28 }).map((_, i) => (
                        <div
                          key={`c-${i}`}
                          className={`h-7 rounded ${i === 10
                            ? "bg-lp-primary/30 border border-lp-primary/50"
                            : i === 15
                              ? "bg-lp-tertiary/20 border border-lp-tertiary/40"
                              : i === 22
                                ? "bg-lp-primary/20 border border-lp-primary/40"
                                : "bg-lp-outline-variant/15"
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chatbot Mezon preview */}
          <div className="glass-card rounded-2xl overflow-hidden flex flex-col hover-lift">
            <div className="p-5 sm:p-6 bg-lp-surface-container/50 border-b border-lp-outline-variant/30">
              <h3 className="text-xl font-semibold text-lp-tertiary">
                Chatbot Mezon
              </h3>
              <p className="text-lp-on-surface-variant text-sm">
                Tương tác nhanh chóng, mọi lúc mọi nơi.
              </p>
            </div>
            <div className="p-5 sm:p-6 bg-lp-bg/40 flex-1 flex items-center justify-center">
              <div className="w-full max-w-sm space-y-5">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-lp-primary flex-shrink-0 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-lp-on-primary text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      smart_toy
                    </span>
                  </div>
                  <div className="bg-lp-surface-container p-4 rounded-2xl rounded-tl-none border border-lp-outline-variant/30 text-sm text-lp-on-surface">
                    Xin chào! Bạn có muốn tôi nhắc nhở sự kiện tiếp theo không?
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-12">
                  <button
                    type="button"
                    className="px-4 py-2 bg-lp-primary/10 border border-lp-primary/30 rounded-full text-xs text-lp-primary hover:bg-lp-primary/20 transition-colors"
                  >
                    Nhắc tôi sau 5p
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-lp-primary/10 border border-lp-primary/30 rounded-full text-xs text-lp-primary hover:bg-lp-primary/20 transition-colors"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
