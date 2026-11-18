"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { updateGroupSettings } from "@/app/workspace/actions";

type GroupPurpose = "event" | "goal";
type FieldType = "text" | "number" | "date" | "url";
type CustomField = {
  id: string;
  label: string;
  field_type: FieldType;
  value: string;
};

type GroupSettingsValues = {
  id: string;
  name: string;
  purpose: GroupPurpose;
  group_type: string;
  description: string | null;
  currency_code: string;
  target_amount: number | string | null;
  event_date: string | null;
  event_location: string | null;
  deadline: string | null;
};

const categories: Record<GroupPurpose, { value: string; label: string }[]> = {
  event: [
    { value: "birthday", label: "Birthday" },
    { value: "wedding", label: "Wedding" },
    { value: "graduation", label: "Graduation" },
    { value: "funeral_bereavement", label: "Funeral & Bereavement" },
    { value: "party_celebration", label: "Party & Celebration" },
    { value: "trip_vacation", label: "Trip & Vacation" },
    { value: "community_event", label: "Community Event" },
    { value: "meeting", label: "Meeting" },
    { value: "fundraiser", label: "Fundraiser" },
    { value: "other_event", label: "Other Event" },
  ],
  goal: [
    { value: "rent_housing", label: "Rent & Housing" },
    { value: "education", label: "Education" },
    { value: "business_investment", label: "Business & Investment" },
    { value: "land_property", label: "Land & Property" },
    { value: "vehicle_purchase", label: "Vehicle Purchase" },
    { value: "fundraising", label: "Fundraising" },
    { value: "project_purchase", label: "Project Purchase" },
    { value: "family_support", label: "Family Support" },
    { value: "shared_savings", label: "Shared Savings" },
    { value: "community_project", label: "Community Project" },
    { value: "other_goal", label: "Other Goal" },
  ],
};

export default function GroupSettingsForm({
  group,
  customFields: initialFields,
  imageUrl,
  currencyLocked,
}: {
  group: GroupSettingsValues;
  customFields: Omit<CustomField, "id">[];
  imageUrl: string | null;
  currencyLocked: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [fields, setFields] = useState<CustomField[]>(
    initialFields.map((field, index) => ({ ...field, id: "existing-" + index })),
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [currency, setCurrency] = useState(group.currency_code);
  const isEvent = group.purpose === "event";

  function addField() {
    if (fields.length >= 10) return;
    setFields((current) => [...current, {
      id: crypto.randomUUID(),
      label: "",
      field_type: "text",
      value: "",
    }]);
  }

  function updateField(id: string, updates: Partial<CustomField>) {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...updates } : field));
  }

  function removeField(id: string) {
    setFields((current) => current.filter((field) => field.id !== id));
  }

  function moveField(id: string, direction: -1 | 1) {
    setFields((current) => {
      const index = current.findIndex((field) => field.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current || pending) return;
    startTransition(() => {
      const formData = new FormData(formRef.current!);
      formData.set("custom_fields", JSON.stringify(fields.map(({ label, field_type, value }) => ({
        label,
        field_type,
        value,
      }))));
      return updateGroupSettings(formData);
    });
  }

  return (
    <form ref={formRef} className="ak-group-settings-form" onSubmit={submit}>
      <input type="hidden" name="group_id" value={group.id} />
      <input type="hidden" name="remove_group_image" value={removeImage ? "true" : "false"} />
      <input type="hidden" name="custom_fields" value={JSON.stringify(fields.map(({ label, field_type, value }) => ({ label, field_type, value })))} />

      <section className="ak-workspace-card ak-settings-section">
        <div className="ak-workspace-card-heading">
          <div>
            <span className="ak-section-eyebrow">GROUP IDENTITY</span>
            <h2>Make this group recognisable</h2>
            <p>Update the name, category, image and description members see.</p>
          </div>
        </div>
        <div className="ak-settings-fields">
          <label className="ak-settings-field">
            <span>Group name <em>Required</em></span>
            <input name="name" defaultValue={group.name} maxLength={80} required />
          </label>
          <div className="ak-settings-field">
            <span>Group type</span>
            <div className="ak-settings-readonly">{isEvent ? "Event" : "Goal"} <small>Group type cannot be changed after creation.</small></div>
          </div>
          <label className="ak-settings-field">
            <span>Category <em>Required</em></span>
            <select name="group_type" defaultValue={group.group_type} required>
              {categories[group.purpose].map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </label>
          <label className="ak-settings-field">
            <span>Description <small>Optional</small></span>
            <textarea name="description" defaultValue={group.description ?? ""} maxLength={500} rows={4} placeholder="Tell members what this group is about." />
            <small>Up to 500 characters.</small>
          </label>
          <div className="ak-settings-field">
            <span>Group image <small>Optional</small></span>
            {imageUrl && !removeImage && (
              <div className="ak-settings-image-preview">
                <img src={imageUrl} alt={group.name + " group"} />
                <button type="button" onClick={() => setRemoveImage(true)}>Remove current image</button>
              </div>
            )}
            {removeImage && <p className="ak-settings-inline-note">The current image will be removed when you save.</p>}
            <input name="group_image" type="file" accept="image/png,image/jpeg,image/webp" onChange={() => setRemoveImage(false)} />
            <small>JPG, PNG or WebP · maximum 5 MB. Uploading a new image replaces the current one.</small>
          </div>
        </div>
      </section>

      <section className="ak-workspace-card ak-settings-section">
        <div className="ak-workspace-card-heading">
          <div>
            <span className="ak-section-eyebrow">{isEvent ? "EVENT DETAILS" : "GOAL DETAILS"}</span>
            <h2>{isEvent ? "The event plan" : "The shared objective"}</h2>
            <p>{isEvent ? "Keep the occasion and its contribution timeline clear." : "Keep the target and its completion timeline clear."}</p>
          </div>
        </div>
        <div className="ak-settings-fields">
          {isEvent && <>
            <label className="ak-settings-field">
              <span>Location <small>Optional</small></span>
              <input name="event_location" defaultValue={group.event_location ?? ""} maxLength={200} placeholder="Venue or event location" />
            </label>
            <label className="ak-settings-field">
              <span>Event date <small>Optional</small></span>
              <input name="event_date" type="date" defaultValue={group.event_date ?? ""} />
            </label>
          </>}
          <label className="ak-settings-field">
            <span>Deadline <small>Optional</small></span>
            <input name="deadline" type="date" defaultValue={group.deadline ?? ""} />
            <small>{isEvent ? "The date by which contributions should ideally be completed. It can differ from the event date." : "When you hope to complete contributions towards this goal."}</small>
          </label>
          <label className="ak-settings-field">
            <span>Target amount <small>Optional</small></span>
            <input name="target_amount" type="number" min="0.01" max="999999999999.99" step="0.01" defaultValue={group.target_amount ?? ""} placeholder="e.g. 100000" />
            <small>A shared group target, not an automatic amount each member must pay.</small>
          </label>
          <div className="ak-settings-field">
            <span>Currency</span>
            {currencyLocked ? (
              <>
                <input type="hidden" name="currency_code" value={currency} />
                <select value={currency} disabled aria-label="Group currency">
                  <option value={currency}>{currency}</option>
                </select>
                <small>Currency is locked because financial activity or payment setup has already started.</small>
              </>
            ) : (
              <>
                <select name="currency_code" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  {group.currency_code !== "KES" && <option value={group.currency_code}>{group.currency_code} · Current currency</option>}
                  <option value="KES">KES · Kenyan Shilling</option>
                </select>
                <small>KES is the default and currently supported currency for M-Pesa. A currency change is available only before financial activity or payment setup begins.</small>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="ak-workspace-card ak-settings-section">
        <div className="ak-workspace-card-heading">
          <div>
            <span className="ak-section-eyebrow">ADDITIONAL DETAILS</span>
            <h2>Add information that matters to this group</h2>
            <p>Create your own labelled details without changing the standard Event or Goal fields.</p>
          </div>
          <span className="ak-count-pill">{fields.length} / 10</span>
        </div>
        {fields.length === 0 ? (
          <div className="ak-settings-empty-fields">
            <strong>No additional details yet</strong>
            <p>Add information such as a dress code, venue contact, project reference or supplier.</p>
          </div>
        ) : (
          <div className="ak-settings-custom-fields">
            {fields.map((field, index) => (
              <div className="ak-settings-custom-field" key={field.id}>
                <div className="ak-settings-custom-field-heading">
                  <strong>Additional detail {index + 1}</strong>
                  <div className="ak-settings-custom-field-actions">
                    <button type="button" onClick={() => moveField(field.id, -1)} disabled={index === 0} aria-label={`Move additional detail ${index + 1} up`}>↑</button>
                    <button type="button" onClick={() => moveField(field.id, 1)} disabled={index === fields.length - 1} aria-label={`Move additional detail ${index + 1} down`}>↓</button>
                    <button type="button" onClick={() => removeField(field.id)}>Remove</button>
                  </div>
                </div>
                <div className="ak-settings-custom-field-grid">
                  <label className="ak-settings-field">
                    <span>Label</span>
                    <input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} maxLength={40} required placeholder="e.g. Dress code" />
                  </label>
                  <label className="ak-settings-field">
                    <span>Field type</span>
                    <select value={field.field_type} onChange={(event) => updateField(field.id, { field_type: event.target.value as FieldType })}>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="url">Link</option>
                    </select>
                  </label>
                  <label className="ak-settings-field ak-settings-custom-value">
                    <span>Value</span>
                    <input
                      type={field.field_type === "date" ? "date" : field.field_type === "number" ? "number" : field.field_type === "url" ? "url" : "text"}
                      step={field.field_type === "number" ? "0.01" : undefined}
                      value={field.value}
                      onChange={(event) => updateField(field.id, { value: event.target.value })}
                      maxLength={500}
                      placeholder={field.field_type === "url" ? "https://" : "Enter a value"}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="ak-settings-add-field" type="button" onClick={addField} disabled={fields.length >= 10}>＋ Add another detail</button>
      </section>

      <div className="ak-settings-save-row">
        <p>Only the Group Creator can change these settings.</p>
        <button className="workspace-primary" type="submit" disabled={pending}>{pending ? "Saving changes…" : "Save changes"}</button>
      </div>
    </form>
  );
}
