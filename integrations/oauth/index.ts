// Google OAuth via Supabase — provider must be enabled in your Supabase Auth settings.
import { supabase } from "../supabase/client";
import type { Provider } from "@supabase/supabase-js";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const oauthClient = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft",
      opts?: SignInOptions,
    ) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
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
