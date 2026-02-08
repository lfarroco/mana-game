// Test utilities for Supabase edge function testing

export interface MockSupabaseClient {
	auth: {
		getUser: () => Promise<{ data: { user: { id: string } | null }, error: Error | null }>;
		signInWithPassword: (credentials: any) => Promise<{ data: any, error: any }>;
		signUp: (credentials: any) => Promise<{ data: any, error: any }>;
		admin: {
			createUser: (userData: any) => Promise<{ data: any, error: any }>;
		};
	};
	from: (table: string) => MockQueryBuilder;
	rpc: (functionName: string, params: any) => Promise<{ data: any, error: any }>;
	functions: {
		invoke: (name: string, options: any) => Promise<{ data: any, error: any }>;
	};
}

export interface MockQueryBuilder {
	select: (columns?: string) => MockQueryBuilder;
	upsert: (data: any, options?: any) => MockQueryBuilder;
	update: (data: any) => MockQueryBuilder;
	eq: (column: string, value: any) => MockQueryBuilder;
	single: () => Promise<{ data: any, error: any }>;
}

export function createMockSupabaseClient(): MockSupabaseClient {
	return {
		auth: {
			getUser: () => Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null }),
			signInWithPassword: () => Promise.resolve({ data: { session: {} }, error: null }),
			signUp: () => Promise.resolve({ data: { session: {} }, error: null }),
			admin: {
				createUser: () => Promise.resolve({ data: { user: {} }, error: null })
			}
		},
		from: () => createMockQueryBuilder(),
		rpc: () => Promise.resolve({ data: null, error: null }),
		functions: {
			invoke: () => Promise.resolve({ data: {}, error: null })
		}
	};
}

export function createMockQueryBuilder(): MockQueryBuilder {
	return {
		select: () => createMockQueryBuilder(),
		upsert: () => createMockQueryBuilder(),
		update: () => createMockQueryBuilder(),
		eq: () => createMockQueryBuilder(),
		single: () => Promise.resolve({ data: {}, error: null })
	};
}

// Mock fetch for external API calls
export function mockFetch(response: any, status = 200) {
	globalThis.fetch = () => Promise.resolve({
		json: () => Promise.resolve(response),
		status
	} as Response);
}

// Restore original fetch
export function restoreFetch() {
	delete globalThis.fetch;
}</content>
<parameter name="filePath">/Users/momo/dev/mana-game/phaser/supabase/functions/action/test_utils.ts