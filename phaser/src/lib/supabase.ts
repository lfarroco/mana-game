import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = "https://supabase-project-REDACTED.supabase.co";
const supabaseKey = "sb_publishable_REDACTED";

let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
	if (!supabaseClient) {
		supabaseClient = createClient(supabaseUrl, supabaseKey);
	}

	return supabaseClient;
};

// Keep existing call sites unchanged while avoiding eager client initialization.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
	get(_target, prop, receiver) {
		const client = getSupabaseClient();
		const value = Reflect.get(client as object, prop, receiver);

		return typeof value === "function" ? value.bind(client) : value;
	},
});
