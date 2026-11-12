import React from "react";
import { Leaf, PiggyBank, Recycle, Users } from "lucide-react";

const circularPillars = [
  {
    title: "Tiết kiệm",
    description:
      "Mua lại giáo trình, máy tính Casio, đồ dùng KTX chuẩn học phần với chi phí tiết kiệm 50%–70% so với mua mới và không tốn phí thuê shipper trung gian (Mô hình Demo).",
    stat: "50% – 70%",
    statLabel: "Chi phí học tập tiết kiệm được",
    icon: PiggyBank,
    accent: "bg-blue-50 text-brand-blue border-blue-200",
  },
  {
    title: "Tái sử dụng",
    description:
      "Giáo trình đại cương và cơ sở ngành thường dùng trong 1 học kỳ (4 tháng) nhưng vẫn còn mới 85%–95%. Chuyền tay cho khóa sau giúp kéo dài vòng đời tài liệu.",
    stat: "3 – 5 Khóa",
    statLabel: "Vòng đời một cuốn giáo trình",
    icon: Recycle,
    accent: "bg-emerald-50 text-brand-green border-emerald-200",
  },
  {
    title: "Giảm lãng phí",
    description:
      "Hạn chế lượng lớn đèn bàn, kệ sách, quạt mini, linh kiện thực hành còn tốt bị bỏ lại hoặc bán phế liệu mỗi mùa tốt nghiệp và chuyển phòng KTX.",
    stat: "Eco-Points",
    statLabel: "Tích điểm tiêu dùng xanh",
    icon: Leaf,
    accent: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    title: "Kết nối sinh viên",
    description:
      "Thúc đẩy cộng đồng trao đổi đồ dùng học đường minh bạch giữa các khóa K48, K49, K50, K51 theo định hướng triển khai tại Đại học Cần Thơ.",
    stat: "46.000+ SV",
    statLabel: "Quy mô sinh viên mục tiêu",
    icon: Users,
    accent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

export function CircularEconomySection() {
  return (
    <section
      aria-labelledby="circular-economy-heading"
      className="border-t border-slate-200/80 bg-white py-14"
    >
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-brand-green">
            <Recycle className="h-3.5 w-3.5" />
            Kinh tế tuần hoàn trong trường đại học (Campus Circular Economy)
          </span>
          <h2
            id="circular-economy-heading"
            className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl"
          >
            Cho đồ cũ một vòng đời mới
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
            Mỗi cuốn giáo trình hay chiếc đèn bàn được trao gửi qua EduLocker
            không chỉ giúp người bán thu hồi chi phí mà còn đồng hành cùng tân
            sinh viên trên giảng đường mới.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {circularPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/50 p-6 shadow-sm transition-all hover:border-brand-green/50 hover:bg-white hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${pillar.accent}`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <div className="text-right">
                      <span className="block text-base font-extrabold text-brand-navy">
                        {pillar.stat}
                      </span>
                      <span className="block text-[11px] font-medium text-slate-500">
                        {pillar.statLabel}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-brand-navy">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
