import { Shuffle } from 'lucide-react';
import { useId, useState } from 'react';
import { AVATARS, getAvatar } from '../config/avatars';
import { cn } from '../lib/cn';
import { normalizeName, randomProfile, validateName, type Profile } from '../lib/profile';
import { Avatar } from './ui/Avatar';

export function ProfileForm({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  error,
  compact = false,
}: {
  value: Profile;
  onChange: (profile: Profile) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string | null;
  compact?: boolean;
}) {
  const inputId = useId();
  const [touched, setTouched] = useState(false);
  const nameError = touched ? validateName(value.name) : null;
  const selected = getAvatar(value.avatarId);
  const shownError = error ?? nameError;

  return (
    <div className={cn('profile-form', compact && 'profile-form--compact')}>
      <div className="field">
        <div className="field__label-row">
          <label htmlFor={inputId} className="field__label">
            Görünen ad
          </label>
          <span className="field__hint">{normalizeName(value.name).length}/16</span>
        </div>
        <input
          id={inputId}
          className={cn('input', shownError && 'input--error')}
          value={value.name}
          onChange={(event) => {
            onChange({ ...value, name: event.target.value });
          }}
          onBlur={() => setTouched(true)}
          maxLength={16}
          placeholder="Örn. Selin"
          autoComplete="nickname"
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? `${inputId}-error` : undefined}
        />
        {shownError ? (
          <p id={`${inputId}-error`} className="field__error">
            {shownError}
          </p>
        ) : (
          <p className="field__hint">
            En az 3, en fazla 16 karakter. Türkçe karakterler serbest.
          </p>
        )}
      </div>

      <div className="field">
        <div className="field__label-row">
          <span className="field__label">Avatar</span>
          <button
            type="button"
            className="text-btn"
            onClick={() => onChange({ ...value, ...randomProfile() })}
            disabled={disabled}
          >
            <Shuffle size={14} />
            Rastgele
          </button>
        </div>
        <div className="avatar-grid" role="listbox" aria-label="Avatar seçimi">
          {AVATARS.map((avatar) => {
            const active = avatar.id === value.avatarId;
            const Icon = avatar.icon;
            return (
              <button
                key={avatar.id}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={avatar.label}
                title={avatar.label}
                className={cn('avatar-option', active && 'avatar-option--active')}
                style={{ background: avatar.gradient, color: avatar.tint }}
                onClick={() => onChange({ ...value, avatarId: avatar.id })}
                disabled={disabled}
              >
                <Icon size={18} strokeWidth={1.9} />
              </button>
            );
          })}
        </div>
        <p className="field__hint">Seçili avatar: {selected.label}</p>
      </div>

      <div className="profile-preview">
        <Avatar avatarId={value.avatarId} size="lg" ring="gold" />
        <div>
          <p className="profile-preview__name">
            {normalizeName(value.name) || 'İsimsiz oyuncu'}
          </p>
          <p className="profile-preview__hint">
            Bu profil yalnızca oynadığınız odada görünür.
          </p>
        </div>
      </div>
    </div>
  );
}
