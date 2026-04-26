const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-key"
}

export default {
  async fetch(req) {
    const url = new URL(req.url)

    const SUPABASE_URL = "https://bgwkwlrkvbspycqsdeif.supabase.co"
    const SERVICE_KEY = "xxxxxx"
    const ADMIN_KEY = "admin-rahasia"

    // ============================
    // CORS
    // ============================
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // ============================
    // AUTH ADMIN
    // ============================
    if (req.headers.get("x-admin-key") !== ADMIN_KEY) {
      return json({ error: "Unauthorized" }, 401)
    }

    // ============================
    // GET ALL USERS
    // ============================
    if (url.pathname === "/admin/users") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/mc_profiles`,
        {
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`
          }
        }
      )

      const data = await res.json()
      return json(data)
    }

    // ============================
    // SET PREMIUM
    // ============================
    if (url.pathname === "/admin/set-premium" && req.method === "POST") {
      const { user_id, is_premium } = await req.json()

      await fetch(
        `${SUPABASE_URL}/rest/v1/mc_profiles?id=eq.${user_id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ is_premium })
        }
      )

      return json({ message: "Updated" })
    }

    // ============================
    // UPDATE USER (full edit)
    // ============================
    if (url.pathname === "/admin/update-user" && req.method === "POST") {
      const { user_id, fields } = await req.json()

      if (!user_id || !fields || typeof fields !== "object") {
        return json({ error: "user_id and fields are required" }, 400)
      }

      // Never allow changing the primary key from this endpoint
      const safe = { ...fields }
      delete safe.id

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/mc_profiles?id=eq.${user_id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify(safe)
        }
      )

      if (!res.ok) {
        const errText = await res.text()
        return json({ error: "Update failed", detail: errText }, res.status)
      }

      const updated = await res.json()
      return json({ message: "User updated", user: Array.isArray(updated) ? updated[0] : updated })
    }

    // ============================
    // GET USAGE
    // ============================
    if (url.pathname === "/admin/usage") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/mc_usage`,
        {
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`
          }
        }
      )

      const data = await res.json()
      return json(data)
    }

    // ============================
    // RESET USAGE USER
    // ============================
    if (url.pathname === "/admin/reset-usage" && req.method === "POST") {
      const { user_id } = await req.json()

      await fetch(
        `${SUPABASE_URL}/rest/v1/mc_usage?user_id=eq.${user_id}`,
        {
          method: "DELETE",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`
          }
        }
      )

      return json({ message: "Usage reset" })
    }

    // ============================
    // DELETE USER
    // ============================
    if (url.pathname === "/admin/delete-user" && req.method === "POST") {
      const { user_id } = await req.json()

      await fetch(
        `${SUPABASE_URL}/rest/v1/mc_profiles?id=eq.${user_id}`,
        {
          method: "DELETE",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`
          }
        }
      )

      return json({ message: "User deleted" })
    }

    return json({ error: "Not found" }, 404)
  }
}

// ============================
// HELPER
// ============================
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  })
}
