// ============================================================
// Hüküm Yolu — Supabase Edge Function
// ============================================================
// Tek HTTP endpoint: `supabase.functions.invoke('game', { body })`.
//
// Güvenlik:
//   * Service role anahtarı yalnızca burada, Deno ortamında bulunur.
//   * İstemci, oyuncu kimliği + yüksek entropili oyuncu sırrı ile doğrulanır.
//   * Sırlar SHA-256 özeti olarak saklanır; düz metin sır veritabanına yazılmaz.
//   * Rol dağıtımı, oy sayımı, yetki kontrolü ve kazanma koşulları sunucuda
//     çalışır. İstemciden gelen rol/oy bilgisi kabul edilmez.
//   * Dönen oyun durumu `redactGameState` ile izleyiciye göre filtrelenir.
// ============================================================

import { GameError } from './engine/index.ts';
import { createAdminClient } from './lib/db.ts';
import {
  authenticate,
  createRoom,
  getState,
  handleGameAction,
  handleLobbyAction,
  heartbeat,
  joinRoom,
  leaveRoom,
} from './lib/handlers.ts';
import {
  EdgeError,
  RoomGoneError,
  SessionGoneError,
  VersionConflictError,
  asString,
  isRecord,
} from './lib/server-types.ts';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

let adminClient: ReturnType<typeof createAdminClient> | null = null;

function getAdmin(): ReturnType<typeof createAdminClient> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new EdgeError('Sunucu yapılandırması eksik.', 500);
  }
  if (!adminClient) {
    adminClient = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  }
  return adminClient;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function handleError(error: unknown): Response {
  if (error instanceof EdgeError) {
    return fail(error.message, error.status);
  }
  if (error instanceof RoomGoneError) {
    return fail('Oda bulunamadı.', 404);
  }
  if (error instanceof SessionGoneError) {
    return fail('Oturum sona erdi. Odaya yeniden katılın.', 401);
  }
  if (error instanceof VersionConflictError) {
    return fail(
      'Oyun durumu başka bir işlemle güncellendi. Yeniden deneyin.',
      409,
    );
  }
  if (error instanceof GameError) {
    return fail(error.message, 400);
  }
  if (error instanceof Error && error.message === 'Oyuncu bulunamadı.') {
    return fail('Hedef oyuncu artık oyunda değil.', 400);
  }
  console.error('Beklenmeyen Edge Function hatası:', error);
  return fail('Sunucu hatası. Lütfen tekrar deneyin.', 500);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return fail('Yalnızca POST destekleniyor.', 405);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body)) {
      return fail('İstek gövdesi kabul edilmedi.', 400);
    }

    const action = asString(body.action);
    if (!action) return fail('İşlem belirtilmedi.', 400);

    const admin = getAdmin();

    switch (action) {
      case 'create_room':
        return json(await createRoom(admin, body));
      case 'join_room':
        return json(await joinRoom(admin, body));
      case 'get_state': {
        const auth = await authenticate(admin, body);
        return json(await getState(admin, auth));
      }
      case 'heartbeat': {
        await authenticate(admin, body);
        return json(heartbeat());
      }
      case 'leave': {
        const auth = await authenticate(admin, body);
        return json(await leaveRoom(admin, auth));
      }
      case 'lobby_action': {
        const auth = await authenticate(admin, body);
        return json(await handleLobbyAction(admin, auth, body));
      }
      case 'game_action': {
        const auth = await authenticate(admin, body);
        return json(await handleGameAction(admin, auth, body));
      }
      default:
        return fail('Bilinmeyen işlem.', 400);
    }
  } catch (error) {
    return handleError(error);
  }
});
