import { useEffect, useState } from 'react';
import { normalizeRoomCode, roomCodeError } from '../lib/validation';
import {
  defaultProfile,
  normalizeName,
  validateName,
  type Profile,
} from '../lib/profile';
import { ProfileForm } from './ProfileForm';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export function ProfileModal({
  open,
  onClose,
  mode,
  initialProfile,
  initialRoomCode = '',
  onSubmit,
  loading = false,
  error = null,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'join' | 'edit';
  initialProfile: Profile;
  initialRoomCode?: string;
  onSubmit: (profile: Profile, roomCode: string) => void;
  loading?: boolean;
  error?: string | null;
}) {
  const [profile, setProfile] = useState<Profile>(initialProfile ?? defaultProfile());
  const [roomCode, setRoomCode] = useState(normalizeRoomCode(initialRoomCode));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProfile(initialProfile ?? defaultProfile());
    setRoomCode(normalizeRoomCode(initialRoomCode));
    setLocalError(null);
    // Yalnızca modal her açıldığında formu tazele.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const nameError = validateName(profile.name);
    if (nameError) {
      setLocalError(nameError);
      return;
    }
    if (mode === 'join') {
      const codeError = roomCodeError(roomCode);
      if (codeError) {
        setLocalError(codeError);
        return;
      }
    }
    setLocalError(null);
    onSubmit(
      { name: normalizeName(profile.name), avatarId: profile.avatarId },
      roomCode,
    );
  };

  const shownError = localError ?? error;
  const title =
    mode === 'create'
      ? 'Oda oluştur'
      : mode === 'join'
        ? 'Odaya katıl'
        : 'Profili düzenle';
  const eyebrow =
    mode === 'edit' ? 'Profil' : 'Çok oyunculu';
  const subtitle =
    mode === 'create'
      ? 'Odayı kur, arkadaşlarını davet et. En az 5, en fazla 10 oyuncu.'
      : mode === 'join'
        ? 'Oda kodunu ve profilini gir. Oda lobideyse hemen katılırsın.'
        : 'Odadaki görünen adın ve avatarın güncellenecek.';
  const submitLabel =
    mode === 'create'
      ? 'Odayı Oluştur'
      : mode === 'join'
        ? 'Odaya Katıl'
        : 'Kaydet';

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      eyebrow={eyebrow}
      subtitle={subtitle}
      size="md"
      footer={
        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="modal-actions__cancel"
          >
            Vazgeç
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            loading={loading}
          >
            {submitLabel}
          </Button>
        </div>
      }
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {shownError ? (
          <div className="form-alert" role="alert">
            {shownError}
          </div>
        ) : null}
        {mode === 'join' ? (
          <div className="field">
            <label className="field__label" htmlFor="join-room-code">
              Oda kodu
            </label>
            <input
              id="join-room-code"
              className="input input--code"
              value={roomCode}
              onChange={(event) => {
                setRoomCode(normalizeRoomCode(event.target.value));
                setLocalError(null);
              }}
              placeholder="ABC234"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              disabled={loading}
            />
            <p className="field__hint">6 karakter. Harf ve rakamlardan oluşur.</p>
          </div>
        ) : null}

        <ProfileForm
          value={profile}
          onChange={(next) => {
            setProfile(next);
            setLocalError(null);
          }}
          disabled={loading}
          autoFocus={mode !== 'join'}
        />
      </form>
    </Modal>
  );
}
