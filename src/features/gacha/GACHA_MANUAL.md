# 🎮 GACHA SYSTEM MANUAL
*Kiến trúc Data-Driven (Genshin Impact Style)*

Tài liệu này hướng dẫn bạn cách quản lý, mở rộng và tùy chỉnh hệ thống Gacha và Cosmetics trong ứng dụng.

---

## 🏗️ 1. Cấu trúc Hệ thống (Architecture)
Hệ thống hoạt động theo nguyên tắc **Dữ liệu điều khiển Logic**. Bạn chỉ cần thay đổi file JSON/JS, giao diện và tính năng sẽ tự động cập nhật.

- **`/src/data`**: Nơi chứa "Linh hồn" của app (Items, Banners, Cosmetics).
- **`/src/managers`**: Nơi xử lý logic (Gacha roll, Pity, Inventory, Theme).
- **`/src/features/gacha`**: Giao diện hiển thị.

---

## 📦 2. Cách thêm Vật phẩm (Items)
Mọi món đồ trong game (vũ khí, khung ảnh, danh hiệu) đều phải được khai báo tại:
`src/data/items.js`

**Cấu trúc mẫu:**
```javascript
"my_new_item": {
  id: "my_new_item",      // ID duy nhất
  name: "Kiếm Ánh Trăng",  // Tên hiển thị
  rarity: "gold",         // gold | purple | blue | gray
  type: "weapon",         // Loại vật phẩm
  icon: "⚔️"               // Biểu tượng
}
```

---

## 🚩 3. Cách thêm Banner mới (Pool)
Hệ thống tự động xoay tua banner dựa trên thời gian. Cấu hình tại:
`src/data/banners.js`

**Các thông số quan trọng:**
- `featured`: Danh sách ID các món đồ "tăng tỉ lệ" (Lấy ID từ file items.js).
- `theme`: Class CSS để đổi màu toàn bộ ứng dụng khi banner này Active.
- `background`: Hiệu ứng nền của thẻ banner.
- `rates`: Tỉ lệ rơi đồ mặc định (chưa tính bảo hiểm).

---

## 💎 4. Hệ thống Bảo hiểm (Pity System)
Hệ thống đã được lập trình sẵn trong `gachaManager.js` với quy tắc:
- **5 Sao (Gold):** Tỉ lệ tăng mạnh từ lượt 74 (**Soft Pity**), chắc chắn ra ở lượt 90 (**Hard Pity**).
- **4 Sao (Purple):** Chắc chắn ra ở mỗi 10 lượt quay.
- **Tự động Reset:** Khi quay ra đồ hiếm, bộ đếm Pity sẽ tự động về 0.

---

## 🎨 5. Tùy chỉnh Giao diện (Theming)
Để tạo một màu sắc mới cho Banner:

1. **Bên SCSS (`GachaTestApp.scss`):**
```scss
.theme-my-color {
  --app-accent: #ff0000;
  --app-bg: radial-gradient(...);
}
```

2. **Bên Data (`banners.js`):**
Gán `theme: 'theme-my-color'` cho banner tương ứng.

---

## ⚡ 6. Tính năng Skip & Animation
- **Bấm 1 lần:** Hiện nút SKIP ở góc phải.
- **Tính năng bảo vệ:** Nếu quay ra **Item mới**, nút SKIP sẽ bị khóa để người dùng phải xem animation.
- **Instant Reveal:** Trong màn hình hiện 10 món, Click lần nữa sẽ hiện toàn bộ kết quả ngay lập tức.

---

*Chúc bạn tạo ra những bản cập nhật "hút máu" nhất!* 🚀
