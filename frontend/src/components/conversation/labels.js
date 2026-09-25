/** "Hôm nay" / "Hôm qua" / dd/mm/yyyy for day separators. */
export function dayLabel(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, today)) return "Hôm nay";
    if (same(d, yesterday)) return "Hôm qua";
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** HH:mm, always absolute (poll-safe, no "x phút trước" drift). */
export function timeLabel(iso) {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
