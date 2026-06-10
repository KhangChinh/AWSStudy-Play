import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          common: {
            settings: "Settings",
            profile: "Profile",
            gacha: "Gacha",
            minigames: "Mini Games",
            store: "Store",
            focus_mode: "Focus Mode",
            logout: "Logout",
            confirm: "Confirm",
            yes: "Yes",
            no: "No",
            save: "Save",
            cancel: "Cancel",
            rename: "Rename",
            username: "Username"
          },
          dashboard: {
            rank: "Rank",
            missions: "Missions",
            cleanup: "Cleanup",
            minimize_all: "Minimize All",
            system_cleanup_complete: "System cleanup complete!",
            logout_confirm: "Are you sure you want to logout?",
          },
          settings: {
            user_preferences: "User Preferences",
            profile_avatar: "Profile Avatar",
            account_details: "Account Details",
            preferences: "Preferences",
            language: "Language",
            app_animations: "App Animations",
            upload_note: "Optimal size 256x256. Max 2MB.",
            rename_cost: "* Rename costs 10,000 P-Coin"
          },
          profile: {
            backgrounds: "Backgrounds",
            titles: "Titles",
            frames: "Frames",
            system_glyphs: "System Glyphs",
            equipped: "Equipped",
          },
          missions: {
            claim_all: "Claim All",
            rewards_claimed: "All rewards claimed!",
          },
          store: {
            title: "Cosmetics Store",
            purchase: "Purchase",
          },
          focus: {
            title: "Focus Mode Settings",
            desc: "Select applications to restrict during your session:",
            start: "Start Focus Session",
            started: "Focus session started!",
            error: "Failed to start focus session!",
          },
          gacha: {
            roll: "Roll",
            pull: "Pull",
            inventory: "Inventory",
            event: "Event",
            remaining: "Remaining",
            details: "Details",
            guaranteed: "Guaranteed",
            single_roll: "Single Roll",
            ten_rolls: "10 Rolls",
            page: "Page",
            no_items: "No items yet.",
            rate_up_desc: "Rate up for selected <span class=\"text-purple\">SR-Rank</span> and <span class=\"text-gold\">Limited SSR-Rank</span> items!"
          },
          minigames: {
            title: "Minigame Hub",
            arcade: "Available Games",
            hall_of_fame: "Hall of Fame",
            study: "Study",
            minigame: "Minigame",
            wins: "Wins",
            coming_soon: "Coming Soon",
            play_now: "Play Now",
            total_wins: "Total Wins"
          }
        }
      },
      vi: {
        translation: {
          common: {
            settings: "Cài đặt",
            profile: "Hồ sơ",
            gacha: "Gacha",
            minigames: "Trò chơi",
            store: "Cửa hàng",
            focus_mode: "Tập trung",
            logout: "Đăng xuất",
            confirm: "Xác nhận",
            yes: "Có",
            no: "Không",
            save: "Lưu",
            cancel: "Hủy",
            rename: "Đổi tên",
            username: "Tên người dùng"
          },
          dashboard: {
            rank: "Hạng",
            missions: "Nhiệm vụ",
            cleanup: "Dọn dẹp",
            minimize_all: "Thu nhỏ hết",
            system_cleanup_complete: "Dọn dẹp hệ thống hoàn tất!",
            logout_confirm: "Xác nhận đăng xuất?",
          },
          settings: {
            user_preferences: "Tùy chỉnh hệ thống",
            profile_avatar: "Ảnh đại diện",
            account_details: "Chi tiết tài khoản",
            preferences: "Tùy chọn",
            language: "Ngôn ngữ",
            app_animations: "Hiệu ứng mở App",
            upload_note: "Kích thước tối ưu 256x256. Tối đa 2MB.",
            rename_cost: "* Đổi tên tốn 10.000 P-Coin"
          },
          profile: {
            backgrounds: "Hình nền",
            titles: "Danh hiệu",
            frames: "Khung",
            system_glyphs: "Cấu trúc Icon",
            equipped: "Đã dùng",
          },
          missions: {
            claim_all: "Nhận hết",
            rewards_claimed: "Đã nhận tất cả phần thưởng!",
          },
          store: {
            title: "Cửa hàng vật phẩm",
            purchase: "Mua ngay",
          },
          focus: {
            title: "Cài đặt sự tập trung",
            desc: "Chọn ứng dụng muốn hạn chế trong phiên làm việc:",
            start: "Bắt đầu tập trung",
            started: "Phiên tập trung đã bắt đầu!",
            error: "Không thể bắt đầu phiên tập trung!",
          },
          gacha: {
            roll: "Quay",
            pull: "Lần",
            inventory: "Kho đồ",
            event: "SỰ KIỆN",
            remaining: "Còn lại",
            details: "Chi tiết",
            guaranteed: "Chắc chắn ra",
            single_roll: "Quay 1 lần",
            ten_rolls: "Quay 10 lần",
            page: "Trang",
            no_items: "Chưa có vật phẩm nào.",
            rate_up_desc: "Tăng tỷ lệ cho các vật phẩm <span class=\"text-purple\">Hạng-SR</span> và <span class=\"text-gold\">Hạng-SSR Giới hạn</span>!"
          },
          minigames: {
            title: "Trung tâm Trò chơi",
            arcade: "Trò chơi hiện có",
            hall_of_fame: "Bảng Vàng",
            study: "Học tập",
            minigame: "Trò chơi",
            wins: "Lần thắng",
            coming_soon: "Sắp ra mắt",
            play_now: "Chơi ngay",
            total_wins: "Tổng Wins"
          }
        }
      }
    },
    fallbackLng: "vi",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
