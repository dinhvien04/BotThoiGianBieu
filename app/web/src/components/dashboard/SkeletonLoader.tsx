"use client";

function Bone({ className = "" }: { className?: string }) {
  return <div className={`bg-surface-container-high rounded-lg animate-pulse ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-8 w-64" />
        <Bone className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <Bone className="h-3 w-16" />
            <Bone className="h-8 w-12" />
            <Bone className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <Bone className="h-6 w-48" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Bone className="h-4 w-12" />
              <Bone className="h-12 flex-1" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
            <Bone className="h-5 w-32" />
            <Bone className="h-40 w-full" />
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
            <Bone className="h-5 w-32" />
            <Bone className="h-32 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm divide-y divide-surface-container-high">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Bone className="w-1.5 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-3/4" />
            <Bone className="h-3 w-1/2" />
          </div>
          <Bone className="h-6 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <Bone className="w-10 h-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Bone className="h-4 w-32" />
          <Bone className="h-3 w-48" />
        </div>
      </div>
      <Bone className="h-24 w-full" />
      <div className="flex gap-2">
        <Bone className="h-8 w-20 rounded-lg" />
        <Bone className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}
