import React, { useContext, useState } from "react";
import { loginWithGoogle } from "../../../firebase_setup/authService";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../../styles/auth.css";

function Login() {
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setError("");
        setIsLoading(true);
        try {
            const result = await loginWithGoogle();
            setUser(result.user);
            
            if (result.isNewUser) {
                // Show welcome message for new users
                console.log("Welcome new user! Default simulation sessions created.");
                // You could show a toast notification here if you have a toast system
            }
            
            navigate("/learn");
        } catch (err) {
            setError("Google login failed. Please try again.");
            console.error("Google Login Failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modern-auth-bg">
            <div className="modern-auth-card">
                <div className="modern-auth-title">Login</div>
                <div className="modern-google-btn-wrap">
                    <button
                        type="button"
                        className="modern-google-btn"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                    >
                        <span className="modern-google-icon">
                            <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.61l6.85-6.85C36.68 2.7 30.77 0 24 0 14.82 0 6.73 5.8 2.69 14.09l7.98 6.19C12.36 13.13 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.28c-1.01-2.99-1.01-6.19 0-9.18l-7.98-6.19C.64 16.41 0 20.13 0 24c0 3.87.64 7.59 1.77 11.09l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.14 15.9-5.82l-7.19-5.59c-2 1.34-4.56 2.13-8.71 2.13-6.26 0-11.64-3.63-13.33-8.59l-7.98 6.19C6.73 42.2 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
                        </span>
                        {isLoading ? "Signing in..." : "Login with Google"}
                    </button>
                </div>
                {error && <p className="modern-auth-error">{error}</p>}
            </div>
        </div>
    );
}

export default Login;
