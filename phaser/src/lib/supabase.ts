import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://bsorlueqmikmixlcryiq.supabase.co";
const supabaseKey = "sb_publishable_75wmGG1tt_gr8aGscan7PQ_kH07-3E1";

let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
	if (!supabaseClient) {
		supabaseClient = createClient(SUPABASE_URL, supabaseKey);
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
