// Sở thích định sẵn - dùng chung cho Hồ sơ (chip chọn) và Tìm bạn cùng phòng
// (chip hiển thị). Giá trị lưu trong DB là string CSV của key, ví dụ
// "music,gym". Key mới phải thêm vào cả backend/database/seeders/UserSeeder.php.
export const HOBBIES = [
    "music",
    "gym",
    "reading",
    "gaming",
    "cooking",
    "photography",
    "football",
    "studying",
    "movies",
    "travel",
    "badminton",
    "cafés",
];

export const HOBBY_LABELS = {
    music: "Âm nhạc",
    gym: "Gym",
    reading: "Đọc sách",
    gaming: "Chơi game",
    cooking: "Nấu ăn",
    photography: "Chụp ảnh",
    football: "Bóng đá",
    studying: "Học tập",
    movies: "Xem phim",
    travel: "Du lịch",
    badminton: "Cầu lông",
    cafés: "Cà phê",
};

/** "music,gym" -> ["Âm nhạc", "Gym"] (key lạ giữ nguyên). */
export function hobbyLabels(interestsCsv) {
    return (interestsCsv || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((key) => HOBBY_LABELS[key] || key);
}
