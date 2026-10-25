import { describe, expect, it } from 'vitest';
import {
  addBotToRoom,
  addHumanToRoom,
  applyGameActionToRoom,
  applyLobbyAction,
  convertPlayerToBot,
  createHostRoom,
  findPlayerByToken,
  projectRoom,
  RoomError,
  startRoomGame,
  toggleReadyInRoom,
} from '../src/net/room';

function lobbyWithHumanAndBots() {
  let state = createHostRoom('ABC234', { name: 'Host', avatarId: 'avatar-1' });
  const added = addHumanToRoom(state, { name: 'Client', avatarId: 'avatar-2' });
  state = toggleReadyInRoom(added.state, added.player.id);
  for (let i = 0; i < 3; i += 1) state = addBotToRoom(state);
  return { state, clientId: added.player.id, clientToken: added.player.token };
}

function startedRoom() {
  const lobby = lobbyWithHumanAndBots();
  return { ...lobby, state: startRoomGame(lobby.state, lobby.state.hostId) };
}

describe('host-authoritative room', () => {
  it('creates a host room with a ready host', () => {
    const state = createHostRoom('ABC234', { name: 'Host', avatarId: 'avatar-1' });
    expect(state.players).toHaveLength(1);
    expect(state.players[0].isHost).toBe(true);
    expect(state.players[0].ready).toBe(true);
    expect(state.hostId).toBe(state.players[0].id);
  });

  it('rejects duplicate names and allows a kick only for the host', () => {
    const lobby = lobbyWithHumanAndBots();
    expect(() =>
      addHumanToRoom(lobby.state, { name: 'client', avatarId: 'avatar-3' }),
    ).toThrow(RoomError);

    const botId = lobby.state.players.find((player) => player.isBot)!.id;
    expect(() =>
      applyLobbyAction(lobby.state, lobby.clientId, { type: 'kick', playerId: botId }),
    ).toThrow(RoomError);

    const kicked = applyLobbyAction(lobby.state, lobby.state.hostId, {
      type: 'kick',
      playerId: lobby.clientId,
    });
    expect(kicked.players.some((player) => player.id === lobby.clientId)).toBe(false);
  });

  it('blocks starting until every human is ready', () => {
    let state = createHostRoom('ABC234', { name: 'Host', avatarId: 'avatar-1' });
    state = addHumanToRoom(state, { name: 'Client', avatarId: 'avatar-2' }).state;
    for (let i = 0; i < 3; i += 1) state = addBotToRoom(state);

    expect(() => startRoomGame(state, state.hostId)).toThrow(/Hazır olmayan/i);
  });

  it('starts with five players and redacts other players roles', () => {
    const room = startedRoom();
    expect(room.state.game).not.toBeNull();
    expect(room.state.game!.players).toHaveLength(5);

    const hostView = projectRoom(room.state, room.state.hostId);
    const clientView = projectRoom(room.state, room.clientId);
    expect(hostView.game?.private.role).toBeTruthy();
    expect(clientView.game?.private.role).toBeTruthy();
    expect(hostView.game?.public.players).toHaveLength(5);

    for (const player of hostView.game!.public.players) {
      expect('role' in (player as unknown as Record<string, unknown>)).toBe(false);
    }
  });

  it('applies role acknowledgements and rejects actions from bots', () => {
    const room = startedRoom();
    let state = applyGameActionToRoom(room.state, room.state.hostId, {
      type: 'ack_role',
    });
    state = applyGameActionToRoom(state, room.clientId, { type: 'ack_role' });
    expect(state.game?.phase).not.toBe('roleReveal');

    const botId = state.players.find((player) => player.isBot)!.id;
    expect(() =>
      applyGameActionToRoom(state, botId, { type: 'ack_role' }),
    ).toThrow(RoomError);
  });

  it('turns a disconnected human into a bot and invalidates the old token', () => {
    const room = startedRoom();
    const converted = convertPlayerToBot(room.state, room.clientId);
    const player = converted.players.find((entry) => entry.id === room.clientId)!;
    expect(player.isBot).toBe(true);
    expect(player.connected).toBe(false);
    expect(player.token).toBe('');
    expect(findPlayerByToken(converted, room.clientToken)).toBeNull();
    expect(converted.game?.players.find((entry) => entry.id === room.clientId)?.isBot).toBe(true);
  });

  it('does not let a non-host restart the game', () => {
    const room = startedRoom();
    expect(() =>
      applyLobbyAction(room.state, room.clientId, { type: 'restart' }),
    ).toThrow(RoomError);
  });
});
