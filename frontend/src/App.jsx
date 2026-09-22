import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

import Home from "./pages/Home/Home";
import Rooms from "./pages/Rooms/Rooms";
import RoomDetail from "./pages/RoomDetail/RoomDetail";
import Map from "./pages/Map/Map";
import StudentPublic from "./pages/StudentPublic/StudentPublic";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

import Favorites from "./pages/Favorites/Favorites";
import Messages from "./pages/Messages/Messages";
import ConversationDetail from "./pages/Messages/ConversationDetail";
import Profile from "./pages/Profile/Profile";

import Roommates from "./pages/Ai/Roommates";
import AreaSuggestions from "./pages/Ai/AreaSuggestions";
import AiChat from "./pages/Ai/Chat";

import MyListings from "./pages/Landlord/MyListings";
import ListingForm from "./pages/Landlord/ListingForm";

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Navbar />
                <main className="flex-grow-1">
                    <Routes>
                        {/* Public */}
                        <Route path="/" element={<Home />} />
                        <Route path="/rooms" element={<Rooms />} />
                        <Route path="/rooms/:id" element={<RoomDetail />} />
                        <Route path="/map" element={<Map />} />
                        <Route path="/students/:id" element={<StudentPublic />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/ai/chat" element={<AiChat />} />

                        {/* Any authenticated user */}
                        <Route
                            path="/messages"
                            element={
                                <ProtectedRoute>
                                    <Messages />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/messages/:id"
                            element={
                                <ProtectedRoute>
                                    <ConversationDetail />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute>
                                    <Profile />
                                </ProtectedRoute>
                            }
                        />

                        {/* Student only */}
                        <Route
                            path="/favorites"
                            element={
                                <ProtectedRoute roles={["student"]}>
                                    <Favorites />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/ai/roommates"
                            element={
                                <ProtectedRoute roles={["student"]}>
                                    <Roommates />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/ai/area-suggestions"
                            element={
                                <ProtectedRoute roles={["student"]}>
                                    <AreaSuggestions />
                                </ProtectedRoute>
                            }
                        />

                        {/* Landlord only */}
                        <Route
                            path="/landlord"
                            element={
                                <ProtectedRoute roles={["landlord"]}>
                                    <MyListings />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/landlord/new"
                            element={
                                <ProtectedRoute roles={["landlord"]}>
                                    <ListingForm />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/landlord/edit/:id"
                            element={
                                <ProtectedRoute roles={["landlord"]}>
                                    <ListingForm />
                                </ProtectedRoute>
                            }
                        />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
                <Footer />
            </AuthProvider>
        </BrowserRouter>
    );
}
