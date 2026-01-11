
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	try {
		const { ticket, appId } = await req.json()
		const steamAppId = appId || Deno.env.get('STEAM_APP_ID') || '3350220'; // Fallback to provided ID or env
		const steamKey = Deno.env.get('STEAM_WEB_API_KEY');

		if (!steamKey) {
			throw new Error("Missing Server Configuration (STEAM_KEY)")
		}

		// 1. Validate Ticket with Steam
		// Use 'partner' or 'public' API. AuthenticateUserTicket is standard.
		// URL: https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/
		const params = new URLSearchParams({
			key: steamKey,
			appid: steamAppId,
			ticket: ticket
		})
		const steamResponse = await fetch(`https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/?${params.toString()}`)
		const steamData = await steamResponse.json()

		if (!steamData || !steamData.response || !steamData.response.params) {
			console.error("Steam API Error Response:", steamData);
			throw new Error("Invalid response from Steam API")
		}

		const result = steamData.response.params.result; // "OK" ?
		const steamId = steamData.response.params.steamid;

		// Note: result might be "OK" or something else. Documentation says "result":"OK".
		// Also check if result is success.
		// Actually, result is strict string "OK".
		if (result !== 'OK') {
			// result might be "OnDuplicateRequest" etc.
			// If validation fails logic...
			console.error("Steam Validation Failed:", steamData);
			throw new Error(`Steam Validation Failed: ${result}`)
		}

		// 2. Deterministic Password Strategy to Login/Register Supabase User
		// Changing salt invalidates passwords, requiring reset. Keep SALT consistent.
		const SALT = steamKey; // Use API Key as Salt since it is secret
		// Simple Hash logic (Web Crypto API available in Deno)
		const passwordSeed = `Steam:${steamId}:${SALT}`;
		const encoder = new TextEncoder();
		const data = encoder.encode(passwordSeed);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const deterministicPassword = "S#" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('') + "!";

		const email = `steam_${steamId}@manabattle.com`;

		// Initialize Supabase Admin Client
		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
		)

		// 3. Try Login
		let { data: sessionData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
			email: email,
			password: deterministicPassword
		})

		if (sessionData.session) {
			return new Response(JSON.stringify(sessionData.session), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
		}

		// 4. If Login Failed, Try Register
		if (loginError && (loginError.message.includes('Invalid login credentials') || loginError.status === 400)) {
			console.log("Login failed, trying registration for:", email);

			// Sign Up
			const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
				email: email,
				password: deterministicPassword,
				options: {
					data: { steam_id: steamId }
				}
			});

			if (signUpError) {
				// If "User already registered" but Login Failed?
				// Could happen if user changed password manually.
				// We could try to FORCE Update Password here if we could find the user.
				// Since we have Admin, maybe we CAN find user by Email via List?
				console.error("SignUp Failed:", signUpError);
				throw signUpError;
			}

			if (signUpData.session) {
				// Auto confirm logic might be needed if Confirm Email is ON.
				// But signUp often returns session if confirm is OFF.
				return new Response(JSON.stringify(signUpData.session), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
			} else if (signUpData.user) {
				// No session returned? Maybe Confirm Email is ON?
				// Admin can create user with `email_confirm: true`?
				// `admin.createUser` is better than `signUp`.
			}
		} else if (loginError) {
			throw loginError;
		}

		// 5. Retry with `admin.createUser` if `signUp` didn't yield session (e.g. email confirm required)
		if (!sessionData.session) {
			// Try explicit Admin Create which skips confirmation
			const { data: adminUserData, error: adminCreateError } = await supabaseAdmin.auth.admin.createUser({
				email,
				password: deterministicPassword,
				email_confirm: true,
				user_metadata: { steam_id: steamId }
			})

			if (adminUserData.user) {
				// Now Login Again
				const { data: finalSession, error: finalLoginError } = await supabaseAdmin.auth.signInWithPassword({
					email: email,
					password: deterministicPassword
				})
				if (finalSession.session) {
					return new Response(JSON.stringify(finalSession.session), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
				}
				if (finalLoginError) throw finalLoginError
			}
			if (adminCreateError) {
				// If "already registered"... we are in the "Wrong Password" loop.
				console.error("Admin Create Failed:", adminCreateError)
				throw adminCreateError
			}
		}

		throw new Error("Authentication Failed");

	} catch (error) {
		console.error("Edge Function Error:", error);
		return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
	}
})
