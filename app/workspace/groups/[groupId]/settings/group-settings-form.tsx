"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { updateGroupSettings } from "@/app/workspace/actions";

type GroupPurpose = "event" | "goal";
type GroupSettingsValues = {
  id: string; name: string; purpose: GroupPurpose; group_type: string;
  description: string | null; currency_code: string;
  target_amount: number | string | null; event_date: string | null;
  event_location: string | null; deadline: string | null;
};

const categories: Record<GroupPurpose, { value: string; label: string }[]> = {
  event: [
    { value: "birthday", label: "Birthday" }, { value: "wedding", label: "Wedding" },
    { value: "graduation", label: "Graduation" }, { value: "funeral_bereavement", label: "Funeral & Bereavement" },
    { value: "party_celebration", label: "Party & Celebration" }, { value: "trip_vacation", label: "Trip & Vacation" },
    { value: "community_event", label: "Community Event" }, { value: "meeting", label: "Meeting" },
    { value: "fundraiser", label: "Fundraiser" }, { value: "other_event", label: "Other Event" },
  ],
  goal: [
    { value: "rent_housing", label: "Rent & Housing" }, { value: "education", label: "Education" },
    { value: "business_investment", label: "Business & Investment" }, { value: "land_property", label: "Land & Property" },
    { value: "vehicle_purchase", label: "Vehicle Purchase" }, { value: "fundraising", label: "Fundraising" },
    { value: "project_purchase", label: "Project Purchase" }, { value: "family_support", label: "Family Support" },
    { value: "shared_savings", label: "Shared Savings" }, { value: "community_project", label: "Community Project" },
    { value: "other_goal", label: "Other Goal" },
  ],
};

export default function GroupSettingsForm({
  group, imageUrl, currencyLocked,
}: { group: GroupSettingsValues; imageUrl: string | null; currencyLocked: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [removeImage, setRemoveImage] = useState(false);
  const [currency, setCurrency] = useState(currencyLocked ? group.currency_code : "KES");
  const isEvent = group.purpose === "event";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current || pending) return;
    const formData = new FormData(formRef.current);
    startTransition(() => updateGroupSettings(formData));
  }

  return (
    <form ref={formRef} className="ak-group-settings-form" onSubmit={submit}>
      <input type="hidden" name="group_id" value={group.id} />
      <input type="hidden" name="remove_group_image" value={removeImage ? "true" : "false"} />
      <section className="ak-workspace-card ak-settings-section">
        <div className="ak-workspace-card-heading"><div>
          <span className="ak-section-eyebrow">GROUP IDENTITY</span>
          <h2>Make this group recognisable</h2>
          <p>Update the name, category, image and description members see.</p>
        </div></div>
        <div className="ak-settings-fields">
          <label className="ak-settings-field"><span>Group name <em>Required</em></span><input name="name" defaultValue={group.name} maxLength={80} required /></label>
          <div className="ak-settings-field"><span>Group type</span><div className="ak-settings-readonly">{isEvent ? "Event" : "Goal"} <small>Group type cannot be changed after creation.</small></div></div>
          <label className="ak-settings-field"><span>Category <em>Required</em></span><select name="group_type" defaultValue={group.group_type} required>{categories[group.purpose].map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
          <label className="ak-settings-field"><span>Description <small>Optional</small></span><textarea name="description" defaultValue={group.description ?? ""} maxLength={500} rows={4} placeholder="Tell members what this group is about." /><small>Up to 500 characters.</small></label>
          <div className="ak-settings-field">
            <span>Group image <small>Optional</small></span>
            {imageUrl && !removeImage && <div className="ak-settings-image-preview"><img src={imageUrl} alt={group.name + " group"} /><button type="button" onClick={() => setRemoveImage(true)}>Remove current image</button></div>}
            {removeImage && <p className="ak-settings-inline-note">The current image will be removed when you save.</p>}
            <input name="group_image" type="file" accept="image/png,image/jpeg,image/webp" onChange={() => setRemoveImage(false)} />
            <small>JPG, PNG or WebP · maximum 5 MB. Uploading a new image replaces the current one.</small>
          </div>
        </div>
      </section>
      <section className="ak-workspace-card ak-settings-section">
        <div className="ak-workspace-card-heading"><div>
          <span className="ak-section-eyebrow">{isEvent ? "EVENT DETAILS" : "GOAL DETAILS"}</span>
          <h2>{isEvent ? "The event plan" : "The shared objective"}</h2>
          <p>{isEvent ? "Keep the occasion and its contribution timeline clear." : "Keep the target and its completion timeline clear."}</p>
        </div></div>
        <div className="ak-settings-fields">
          {isEvent && <>
            <label className="ak-settings-field"><span>Location <small>Optional</small></span><input name="event_location" defaultValue={group.event_location ?? ""} maxLength={200} placeholder="Venue or event location" /></label>
            <label className="ak-settings-field"><span>Event date <small>Optional</small></span><input name="event_date" type="date" defaultValue={group.event_date ?? ""} /></label>
          </>}
          <label className="ak-settings-field"><span>Deadline <small>Optional</small></span><input name="deadline" type="date" defaultValue={group.deadline ?? ""} /><small>{isEvent ? "The date by which contributions should ideally be completed. It can differ from the event date." : "When you hope to complete contributions towards this goal."}</small></label>
          <label className="ak-settings-field"><span>Target amount <small>Optional</small></span><input name="target_amount" type="number" min="0.01" max="999999999999.99" step="0.01" defaultValue={group.target_amount ?? ""} placeholder="e.g. 100000" /><small>A shared group target, not an automatic amount each member must pay.</small></label>
          <div className="ak-settings-field">
            <span>Currency</span>
            {currencyLocked ? <>
              <input type="hidden" name="currency_code" value={currency} />
              <select value={currency} disabled aria-label="Group currency"><option value={currency}>{currency}</option></select>
              <small>Currency is locked because financial activity or payment setup has already started.</small>
            </> : <>
              <select name="currency_code" value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="KES">KES · Kenyan Shilling</option></select>
              <small>KES is currently supported for M-Pesa. Groups created with another currency will move to KES when saved, provided no financial activity or payment setup has started.</small>
            </>}
          </div>
        </div>
      </section>
      <div className="ak-settings-save-row"><p>Only the Group Creator can change these settings.</p><button className="workspace-primary" type="submit" disabled={pending}>{pending ? "Saving changes…" : "Save changes"}</button></div>
    </form>
  );
}
