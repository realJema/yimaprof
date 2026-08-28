import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Supabase recovery links can land on any allowed redirect URL (often "/").
 * Whenever we detect recovery parameters in the URL, forward the user to the
 * /reset-password screen while preserving the tokens, so they always get the
 * "choose a new password" form instead of being silently signed in.
 */
const RecoveryRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/reset-password") return;

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);

    const isRecovery =
      hashParams.get("type") === "recovery" ||
      queryParams.get("type") === "recovery" ||
      // Error states from an expired/used recovery link
      (hashParams.get("error_code") === "otp_expired" && hashParams.get("type") === "recovery");

    if (isRecovery) {
      navigate(
        {
          pathname: "/reset-password",
          search: window.location.search,
          hash: window.location.hash,
        },
        { replace: true },
      );
    }
  }, [location.pathname, navigate]);

  return null;
};

export default RecoveryRedirect;
