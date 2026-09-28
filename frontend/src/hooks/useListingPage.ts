import { useEffect, useState } from "react";
import { errMessage } from "../api/axiosClient";
import type { PaginationMeta } from "../types/api";

/**
 * Máy chạy trang danh sách tin đăng phân trang, dùng chung cho
 * Favorites / MyListings (debt #3 trong docs/TECH-DEBT.md): state
 * listings/meta/page/loading/error, reset skeleton khi đổi truy vấn
 * (so sánh prev TRONG RENDER - pattern cả hai page dùng trước khi gộp,
 * thay thế setState đồng bộ trong effect), effect fetch có cleanup `active`,
 * và refresh không bật skeleton (dùng sau khi xóa/cập nhật một row).
 */
export function useListingPage<T>(
  fetcher: (page: number) => Promise<{ data: T[]; meta: PaginationMeta }>,
  queryKey: (string | number | undefined)[] = []
) {
  const [listings, setListings] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Tăng tick để fetch lại trang hiện tại mà KHÔNG bật skeleton.
  const [refreshTick, setRefreshTick] = useState(0);

  // Skeleton lại khi đổi trang/tham số: reset trong render bằng so sánh
  // prev thay vì setState đồng bộ trong effect (react-hooks purity).
  const key = [page, ...queryKey];
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey.length !== key.length || prevKey.some((v, i) => v !== key[i])) {
    setPrevKey(key);
    setLoading(true);
  }

  useEffect(() => {
    let active = true;
    fetcher(page)
      .then(({ data, meta: m }) => {
        if (active) {
          setListings(data);
          setMeta(m);
        }
      })
      .catch((err) => {
        if (active) setError(errMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // fetcher là hàm inline của page - bỏ qua để không fetch lại mỗi render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshTick, ...queryKey]);

  /** Đổi trang và cuộn lên đầu (cả hai page đều làm vậy trong Pagination). */
  function setPage(p: number): void {
    setPageState(p);
    window.scrollTo(0, 0);
  }

  return {
    listings,
    setListings,
    meta,
    page,
    setPage,
    loading,
    error,
    refresh: () => setRefreshTick((t) => t + 1),
  };
}
