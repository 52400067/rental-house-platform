import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";

/**
 * Logic form xác thực dùng chung cho Login/Register (debt #2 trong
 * docs/TECH-DEBT.md): trạng thái busy, chặn submit kép, và điều hướng sau
 * khi thành công. Riêng phần trạng thái lỗi thuộc về từng page (Login dùng
 * chuỗi alert, Register dùng map lỗi theo field), nên page tự clear trong
 * `submit()` và map lỗi trong `onError(err)`.
 *
 * @param {{
 *   submit: () => Promise<void>,
 *   onError?: (err: unknown) => void,
 *   afterSuccess?: () => void,
 * }} config
 * @returns {{ busy: boolean, handleSubmit: (e: SubmitEvent) => Promise<void> }}
 */
export function useAuthForm({ submit, onError, afterSuccess }) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setBusy(true);
        try {
            await submit();
            if (afterSuccess) {
                afterSuccess();
            } else {
                navigate(ROUTES.HOME, { replace: true });
            }
        } catch (err) {
            onError?.(err);
        } finally {
            setBusy(false);
        }
    }

    return { busy, handleSubmit };
}
