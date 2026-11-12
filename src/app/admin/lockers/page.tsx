import React from "react";
import { Badge } from "@/components/ui/badge";
import { AdminLockerMaintenanceButton } from "@/components/admin/admin-actions-clients";
import { fetchAdminLockers } from "@/features/admin/admin-repository";

export const dynamic = "force-dynamic";

export default async function AdminLockersPage() {
  const { locations, activeReservations } = await fetchAdminLockers();
  const resByComp = new Map(
    activeReservations.map((r) => [r.compartmentId, r]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-brand-navy">
          Quản trị Smart Locker Simulator
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Chuyển trạng thái ngăn tủ giữa <code>AVAILABLE</code> và{" "}
          <code>MAINTENANCE</code>. Hệ thống chặn đặt bảo trì nếu ngăn đang giữ
          chỗ (<code>RESERVED</code>) hoặc đang chứa hàng (<code>OCCUPIED</code>).
        </p>
      </div>

      {locations.map((loc) => (
        <div
          key={loc.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-brand-navy">
                {loc.name}
              </h3>
              <p className="text-xs text-slate-500">{loc.campusArea}</p>
            </div>
            <Badge variant="eco">
              Trống: {loc.availableCompartments}/{loc.totalCompartments}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {loc.compartments.map((comp) => {
              const activeRes = resByComp.get(comp.id);
              return (
                <div
                  key={comp.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-brand-navy">
                        {comp.code}
                      </span>
                      <Badge variant="outline">{comp.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {comp.sizeLabel}
                    </p>
                    {activeRes && (
                      <p className="mt-1 font-mono text-[10px] text-brand-blue">
                        Đơn: #{activeRes.orderId.slice(0, 8).toUpperCase()} (
                        {activeRes.status})
                      </p>
                    )}
                  </div>
                  <AdminLockerMaintenanceButton
                    compartmentId={comp.id}
                    status={comp.status}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

