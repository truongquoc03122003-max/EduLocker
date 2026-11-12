import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AppUIProvider } from "@/hooks/use-app-ui";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import { fetchUnreadNotificationCount } from "@/features/notifications/notification-repository";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EduLocker – Gửi An Tâm, Nhận Tiết Kiệm | Marketplace Sinh Viên",
    template: "%s | EduLocker",
  },
  description:
    "Nền tảng thương mại trao đổi giáo trình, máy tính cầm tay, dụng cụ học tập và đồ dùng ký túc xá cho sinh viên kết hợp hệ thống Smart Locker tại Đại học Cần Thơ.",
  icons: {
    icon: "/logo-edulocker.png",
    apple: "/logo-edulocker.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isConfigured, userProfile } = await getCurrentUserProfile();
  const unreadNotifications = userProfile
    ? await fetchUnreadNotificationCount(userProfile.id)
    : 0;

  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="flex min-h-screen flex-col bg-[#F8FAFC] font-sans text-[#102A56]">
        <AppUIProvider
          initialUser={userProfile}
          isSupabaseConfigured={isConfigured}
        >
          <SiteHeader unreadNotifications={unreadNotifications} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </AppUIProvider>
      </body>
    </html>
  );
}
