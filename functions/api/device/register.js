import { getCurrentUser, json } from "../../_shared/auth.js";

const MAX_PUBLIC_KEY_LENGTH = 4096;

function safeString(value) {
  return String(value || "").trim();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await getCurrentUser(request, env);

  if (!user) {
    return json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const deviceId = safeString(body.device_id);
  const deviceName = safeString(body.device_name).slice(0, 64) || "Web Browser";
  const publicKey = safeString(body.public_key);
  const keyAlgorithm = safeString(body.key_algorithm) || "p256-ecdh";

  if (!deviceId || deviceId.length > 80) {
    return json({ ok: false, error: "Invalid device id" }, { status: 400 });
  }

  if (!publicKey || publicKey.length > MAX_PUBLIC_KEY_LENGTH) {
    return json({ ok: false, error: "Invalid public key" }, { status: 400 });
  }

  if (keyAlgorithm !== "p256-ecdh") {
    return json({ ok: false, error: "Unsupported key algorithm" }, { status: 400 });
  }

  const existing = await env.DB.prepare(
    "SELECT id, user_id FROM devices WHERE id = ? LIMIT 1"
  )
    .bind(deviceId)
    .first();

  if (existing && existing.user_id !== user.id) {
    return json({ ok: false, error: "Device id conflict" }, { status: 409 });
  }

  if (existing) {
    await env.DB.prepare(
      `UPDATE devices
       SET device_name = ?,
           public_key = ?,
           key_algorithm = ?,
           last_seen_at = datetime('now'),
           revoked_at = NULL
       WHERE id = ? AND user_id = ?`
    )
      .bind(deviceName, publicKey, keyAlgorithm, deviceId, user.id)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO devices (
        id,
        user_id,
        device_name,
        public_key,
        key_algorithm,
        created_at,
        last_seen_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
      .bind(deviceId, user.id, deviceName, publicKey, keyAlgorithm)
      .run();
  }

  return json({
    ok: true,
    device: {
      id: deviceId,
      device_name: deviceName,
      key_algorithm: keyAlgorithm
    }
  });
}
