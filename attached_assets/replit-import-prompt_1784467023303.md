I'm importing this project from a Lovable/GitHub export. Before making any code changes, please do the following:

1. **Audit the codebase** for any calls to the Lovable AI Gateway (used for Gemini vision OCR and AI structuring calls). These will not work outside Lovable's environment and need to be replaced with direct calls to the Google Gemini API using the standard Gemini SDK/REST endpoint.

2. **List out every secret/environment variable this project needs to run**, based on what's referenced in the code (Supabase client setup, auth config, AI provider calls, etc.), and ask me to provide each one before proceeding. At minimum I expect this project needs:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (if used server-side)
   - GEMINI_API_KEY (replacing the Lovable AI Gateway)
   - GOOGLE_CLIENT_ID (for Google auth)
   - GOOGLE_CLIENT_SECRET (for Google auth)

   If you find references to any other keys or environment variables in the code that aren't in this list, add them to what you ask me for.

3. **Do not guess or fabricate placeholder values** for any of these — pause and ask me to paste in the real values, then store them in Replit Secrets (not hardcoded in files).

4. Once all secrets are provided and the Gemini Gateway calls are swapped to direct Gemini API calls, run the project and confirm:
   - The app builds and starts without errors
   - Supabase connection works
   - Google auth login works
   - A test OCR call against Gemini succeeds

Only after all of that is confirmed working should you consider the import complete.
