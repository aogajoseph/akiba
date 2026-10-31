"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { saveProfile } from "./actions";
import { createClient } from "@/lib/supabase/client";

type ProfileValues = {
  username: string;
  displayName: string;
  avatarPath: string | null;
  bio: string;
  phoneNumber: string;
};

type Availability = { username: string; available: boolean; message: string };

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export default function ProfileForm({ initial }: { initial: ProfileValues }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(initial.username);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [phoneNumber, setPhoneNumber] = useState(initial.phoneNumber);
  const [avatarPath, setAvatarPath] = useState(initial.avatarPath ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentAvailability = availability?.username === username ? availability : null;
  const usernameValid = USERNAME_PATTERN.test(username);
  const usernameAvailable = usernameValid && currentAvailability?.available === true;

  const initialAvatarUrl = useMemo(() => {
    if (!avatarPath) return "";
    return createClient().storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl;
  }, [avatarPath]);

  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!usernameValid) {
      setAvailability(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          "/api/username-availability?username=" + encodeURIComponent(username),
          { signal: controller.signal },
        );
        const json = await response.json();
        setAvailability({
          username,
          available: response.ok && json.available === true,
          message: !response.ok
            ? (json.reason || "Could not check availability.")
            : json.available
              ? "Username available"
              : "Username already taken",
        });
      } catch {
        if (!controller.signal.aborted) {
          setAvailability({ username, available: false, message: "Could not check availability. Try again." });
        }
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [username, usernameValid]);

  function chooseAvatar(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Your picture must be 3 MB or smaller.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveAvatar(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!displayName.trim()) {
      setError("Enter the name people should see on Akiba.");
      return;
    }
    if (!usernameValid || !usernameAvailable) {
      setError("Choose a valid, available username before continuing.");
      return;
    }
    const normalizedPhone = phoneNumber.trim().replace(/[\s()-]/g, "");
    if (normalizedPhone && !/^\+[1-9][0-9]{7,14}$/.test(normalizedPhone)) {
      setError("Enter an international phone number, including + and the country code.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("username", username);
    formData.set("display_name", displayName.trim());
    formData.set("bio", bio.trim());
    formData.set("phone_number", normalizedPhone);
    formData.set("avatar_path", removeAvatar ? "" : avatarPath);
    formData.set("remove_avatar", removeAvatar ? "yes" : "no");

    if (selectedFile) {
      setUploading(true);
      try {
        const supabase = createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error("Your session has expired. Sign in again.");
        const extension = selectedFile.type === "image/png" ? "png" : selectedFile.type === "image/webp" ? "webp" : "jpg";
        const path = authData.user.id + "/" + crypto.randomUUID() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, selectedFile, {
          cacheControl: "3600",
          contentType: selectedFile.type,
          upsert: false,
        });
        if (uploadError) throw new Error("We couldn't upload your picture. Please try again.");
        formData.set("avatar_path", path);
        formData.set("remove_avatar", "no");
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "We couldn't upload your picture. Please try again.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    startTransition(() => {
      void saveProfile(formData);
    });
  }

  const avatarUrl = previewUrl || (removeAvatar ? "" : initialAvatarUrl);
  const initials = (displayName.trim() || username || "A").slice(0, 1).toUpperCase();

  return (
    <form className="profile-setup-form" onSubmit={handleSubmit} noValidate>
      <section className="profile-avatar-section">
        <div className="profile-avatar-preview" aria-label="Profile picture preview">
          {avatarUrl ? <img src={avatarUrl} alt="Your profile preview" /> : <span>{initials}</span>}
        </div>
        <div className="profile-avatar-copy">
          <strong>Your profile picture</strong>
          <p>Help friends recognise you. JPG, PNG or WebP, up to 3 MB.</p>
          <div className="profile-avatar-actions">
            <button type="button" className="profile-secondary-button" onClick={() => fileInput.current?.click()}>
              {avatarPath || selectedFile ? "Change picture" : "Upload picture"}
            </button>
            {(avatarPath || selectedFile) && (
              <button type="button" className="profile-remove-button" onClick={() => {
                setSelectedFile(null);
                setPreviewUrl("");
                setAvatarPath("");
                setRemoveAvatar(true);
                if (fileInput.current) fileInput.current.value = "";
              }}>Remove</button>
            )}
          </div>
          <input ref={fileInput} className="profile-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
        </div>
      </section>

      <div className="profile-field">
        <label htmlFor="display-name">Display name <span>Required</span></label>
        <input id="display-name" name="display_name" value={displayName} onChange={(event) => setDisplayName(event.target.value.slice(0, 60))} maxLength={60} autoComplete="name" placeholder="What should people call you?" required />
        <small>This is the name people will see across Akiba.</small>
      </div>

      <div className="profile-field">
        <label htmlFor="profile-username">Unique username <span>Required</span></label>
        <div className="profile-username-input"><span>@</span><input id="profile-username" name="username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))} minLength={3} maxLength={20} autoComplete="username" required /></div>
        <small className={usernameValid && currentAvailability ? (currentAvailability.available ? "profile-field-success" : "profile-field-error") : ""} role="status" aria-live="polite">
          {!usernameValid ? "3–20 characters. Start with a letter; use letters, numbers or underscores." : currentAvailability?.message ?? "Checking username availability…"}
        </small>
      </div>

      <div className="profile-field">
        <label htmlFor="profile-bio">About you <span>Optional</span></label>
        <textarea id="profile-bio" name="bio" value={bio} onChange={(event) => setBio(event.target.value.slice(0, 160))} maxLength={160} rows={3} placeholder="A little about yourself…" />
        <small className="profile-character-count">{bio.length}/160</small>
      </div>

      <div className="profile-field">
        <label htmlFor="profile-phone">Phone number <span>Optional</span></label>
        <input id="profile-phone" name="phone_number" type="tel" inputMode="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.slice(0, 30))} placeholder="+254 7XX XXX XXX" />
        <small>Include your country code. Your number is private and is not yet used for sign-in or verification.</small>
      </div>

      {error && <p className="profile-form-error" role="alert">{error}</p>}
      <div className="profile-form-footer">
        <p>You can add more details later in Profile Settings.</p>
        <button type="submit" className="profile-submit-button" disabled={pending || uploading || !usernameAvailable}>
          {uploading ? "Uploading picture…" : pending ? "Saving profile…" : "Complete profile"}
          {!pending && !uploading && <span aria-hidden="true">→</span>}
        </button>
      </div>
    </form>
  );
}
