// ============================================================
//  Conexión con tu Supabase
//  Estos dos datos son PÚBLICOS y seguros de tener aquí:
//  la seguridad la dan las reglas (RLS) que activaste en la Etapa 3.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xkwjvjlwlgjkmrqtdvdl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrd2p2amx3bGdqa21ycXRkdmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNzk3MTQsImV4cCI6MjA5ODk1NTcxNH0.4gx9svTiyL91Fq8WOtCVKCx2lG5JtzEv8ALX7APVA8Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
