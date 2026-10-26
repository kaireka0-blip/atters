import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") || "mailto:atter@admin.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured in Edge Function" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: appUsers, error: appUserError } = await supabase
      .from("users")
      .select("id,email,role")
      .ilike("email", authData.user.email.replace(/[\\%_]/g, "\\$&"))
      .limit(2);
    if (appUserError) throw appUserError;
    const appUser = appUsers?.length === 1 && appUsers[0].email.toLowerCase() === authData.user.email.toLowerCase()
      ? appUsers[0]
      : null;
    if (appUser?.role !== "Admin") {
      return new Response(JSON.stringify({ error: "Admin access is required." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: "Web Push is not configured." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { vendor_id, user_id, event_type, title, message, url, icon, tag } = body;

    // Strict multi-tenant validation: vendor_id is required
    if (!vendor_id) {
      return new Response(
        JSON.stringify({ error: "vendor_id is required for multi-tenant isolation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let loginTargetEndpoints: string[] | null = null;
    if (event_type === "login") {
      // A login alert can only be sent to other active sessions belonging to
      // the same authenticated account. Resolve endpoints server-side so a
      // caller cannot target another account's browser subscriptions.
      if (!user_id || user_id !== authData.user.id) {
        return new Response(JSON.stringify({ error: "Login alerts may only target the current account." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authorization.replace(/^Bearer\s+/i, "").split(".")[1] || "";
      const normalizedToken = token.replace(/-/g, "+").replace(/_/g, "/");
      const paddedToken = normalizedToken.padEnd(Math.ceil(normalizedToken.length / 4) * 4, "=");
      const currentSessionId = token ? JSON.parse(atob(paddedToken)).session_id : null;
      if (!currentSessionId) {
        return new Response(JSON.stringify({ error: "Current login session could not be verified." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: activeEndpoints, error: sessionsError } = await supabase.rpc(
        "get_active_other_login_push_endpoints",
        { p_user_id: user_id, p_excluded_session_id: currentSessionId },
      );
      if (sessionsError) throw sessionsError;
      loginTargetEndpoints = [...new Set((activeEndpoints || [])
        .map((target) => target.endpoint)
        .filter((endpoint): endpoint is string => Boolean(endpoint)))];
      if (loginTargetEndpoints.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: "No other active sessions with Web Push enabled.",
          deliveredCount: 0,
          totalSubscriptions: 0,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Query active push subscriptions only for this vendor. Login alerts are
    // further restricted to push endpoints stored on other live sessions.
    let query = supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .eq("vendor_id", vendor_id)
      .eq("is_active", true);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }
    if (loginTargetEndpoints) {
      query = query.in("endpoint", loginTargetEndpoints);
    }

    const { data: subscriptions, error: dbError } = await query;
    if (dbError) throw dbError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active push subscriptions found for this vendor.",
          deliveredCount: 0,
          totalSubscriptions: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pushPayload = JSON.stringify({
      title: title || "Attera Visual",
      body: message || "Ada pembaruan baru di aplikasi.",
      icon: icon || "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      url: url || "/",
      tag: tag || `attera-visual-${Date.now()}`,
      timestamp: Date.now(),
    });

    let deliveredCount = 0;
    let failedCount = 0;
    const staleSubscriptionIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, pushPayload);
          deliveredCount++;
        } catch (pushErr: any) {
          failedCount++;
          console.warn("[send-web-push] Delivery failed for endpoint:", sub.endpoint, pushErr?.statusCode);
          // If 404 or 410 Gone, the subscription is expired or cancelled by browser
          if (pushErr?.statusCode === 404 || pushErr?.statusCode === 410) {
            staleSubscriptionIds.push(sub.id);
          }
        }
      })
    );

    // Deactivate stale subscriptions
    if (staleSubscriptionIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("id", staleSubscriptionIds)
        .catch((cleanErr) => console.warn("[send-web-push] Stale cleanup error:", cleanErr));
    }

    return new Response(
      JSON.stringify({
        success: true,
        deliveredCount,
        failedCount,
        totalSubscriptions: subscriptions.length,
        cleanedStaleCount: staleSubscriptionIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-web-push] Unhandled error:", error);
    return new Response(JSON.stringify({ error: error.message || "Push dispatch failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
