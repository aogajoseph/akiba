"use client";

import { useEffect, useState, type ChangeEvent } from "react";

type Props = { currentImage: string | null; fallback: string };

export function ProfileImagePicker({ currentImage, fallback }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setError(null);
    if (!file) { setSelectedFile(null); setPreviewUrl(null); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      event.currentTarget.value = "";
      setSelectedFile(null);
      setPreviewUrl(null);
      setError("That file type is not supported. Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      event.currentTarget.value = "";
      setSelectedFile(null);
      setPreviewUrl(null);
      setError("That image is larger than 3 MB. Choose a smaller image.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <div className="ak-settings-image-preview">
      {previewUrl ? <img src={previewUrl} alt="Preview of selected profile photo" /> :
        currentImage ? <img src={currentImage} alt="Current profile photo" /> :
        <span className="ak-settings-page-image" aria-label="Profile photo placeholder">{fallback}</span>}
      <div className="ak-settings-field">
        <span>Profile photo <small>Optional · JPG, PNG or WebP · 3 MB max</small></span>
        <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} aria-describedby={error ? "profile-photo-error" : "profile-photo-help"} />
        <small id="profile-photo-help">{selectedFile ? "Selected: " + selectedFile.name : "Choose a photo to preview it before saving."}</small>
        {error && <small id="profile-photo-error" className="ak-settings-field-error" role="alert">{error}</small>}
      </div>
    </div>
  );
}
