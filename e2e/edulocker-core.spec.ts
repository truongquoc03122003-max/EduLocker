import { test, expect } from "@playwright/test";

test.describe("EduLocker E2E Core Flows", () => {
  test("Flow 1 – Guest: Home -> Marketplace -> Product -> Favorite -> Sell -> Redirect Login", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Khám phá/i }).first()).toBeVisible();

    await page.goto("/products");
    await expect(page).toHaveURL(/\/products/);

    // Open first product card link
    const firstProductLink = page.locator('a[href^="/products/"]').first();
    await expect(firstProductLink).toBeVisible();
    await firstProductLink.click();
    await expect(page).toHaveURL(/\/products\/.+/);

    // Save favorite in guest mode
    const favButton = page.getByRole("button", { name: /Lưu sản phẩm|Đã lưu/i });
    if (await favButton.isVisible()) {
      await favButton.click();
    }

    // Protected routes redirect unauthenticated guests to /login
    await page.goto("/sell");
    await expect(page).toHaveURL(/\/login\?next=%2Fsell/);

    await page.goto("/messages");
    await expect(page).toHaveURL(/\/login\?next=%2Fmessages/);

    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/login\?next=%2Fnotifications/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });

  test("Flow 2 – Public Smart Locker Simulator & Responsive Viewports (Desktop 1440 / Tablet 768 / Mobile 390)", async ({
    page,
  }) => {
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto("/");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2,
      );
      expect(overflow).toBe(false);

      await page.goto("/lockers/locker-thu-vien");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const lockerOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2,
      );
      expect(lockerOverflow).toBe(false);
    }
  });

  test("Flow 3–8 – Authenticated Auth, Profile, Messages, Notifications & Admin Authorization (when E2E creds provided)", async ({
    page,
  }) => {
    const email = process.env.E2E_BUYER_EMAIL;
    const password = process.env.E2E_BUYER_PASSWORD;
    test.skip(!email || !password, "E2E credentials not configured in environment");

    await page.goto("/login");
    await page.getByLabel(/Email/i).fill(email!);
    await page.locator("#login-password").fill(password!);
    await page.getByRole("button", { name: /Đăng nhập/i }).click();
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/profile");
    await expect(page.getByText(/Hồ sơ/i).first()).toBeVisible();

    await page.goto("/messages");
    await expect(page.getByText(/Tin nhắn/i).first()).toBeVisible();

    await page.goto("/notifications");
    await expect(page.getByText(/Thông báo/i).first()).toBeVisible();

    // Non-admin student must receive 403 UI on /admin
    await page.goto("/admin");
    await expect(page.getByText(/403 – Không có quyền truy cập/i)).toBeVisible();
  });
});

