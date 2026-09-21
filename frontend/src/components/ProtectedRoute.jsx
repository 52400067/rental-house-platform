import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route guard. `roles` optionally limits by user role
 * (e.g. ["student"] or ["landlord"]); wrong role → /login.
 */
export default function ProtectedRoute({ roles, children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border" role="status" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
