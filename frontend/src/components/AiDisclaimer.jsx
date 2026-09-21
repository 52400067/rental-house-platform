/** API_CONTRACT §4 AI: "Luôn gắn nhãn cho kết quả: 'Gợi ý tham khảo do AI tạo ra'". */
export default function AiDisclaimer() {
    return (
        <p className="small mb-0" style={{ color: "var(--bs-secondary-color)" }}>
            <i className="bi bi-stars me-1" />
            Gợi ý tham khảo do AI tạo ra
        </p>
    );
}
