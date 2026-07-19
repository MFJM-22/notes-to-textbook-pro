// Lovable auth replaced with direct Supabase OAuth.
// Google OAuth provider must be enabled in your Supabase project's Auth settings.
import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft",
      opts?: SignInOptions,
    ) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin,
          queryParams: opts?.extraParams,
        },
      });
      if (error) return { error, redirected: false };
      // Supabase redirects the browser to the OAuth provider — no further action needed.
      return { error: null, redirected: true };
    },
  },
};
