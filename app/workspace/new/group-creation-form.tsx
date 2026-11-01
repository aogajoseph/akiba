"use client";

import { useMemo, useState } from "react";
import { createGroup } from "@/app/workspace/actions";

const catalogue = {
  event: {
    label: "Event",
    description: "Bring people together around an occasion, activity or celebration.",
    types: [
      ["birthday", "Birthday", "Birthdays, gifts and celebrations"],
      ["wedding", "Wedding", "Wedding preparations and celebrations"],
      ["graduation", "Graduation", "Graduation celebrations and support"],
      ["funeral_bereavement", "Funeral & Bereavement", "Support for a bereaved family"],
      ["party_celebration", "Party & Celebration", "Parties, reunions and special occasions"],
      ["trip_vacation", "Trip & Vacation", "Group travel and shared experiences"],
      ["community_event", "Community Event", "Community activities and gatherings"],
      ["fundraiser", "Fundraiser", "A one-time fundraising initiative"],
      ["other_event", "Other Event", "Another event or occasion"],
    ],
  },
  goal: {
    label: "Goal",
    description: "Work together towards a shared objective, expense or financial target.",
    types: [
      ["rent_housing", "Rent & Housing", "Rent, deposits and household expenses"],
      ["education", "Education", "School fees, tuition and education costs"],
      ["business_investment", "Business & Investment", "Business capital and shared investments"],
      ["land_property", "Land & Property", "Land purchases, construction and property"],
      ["vehicle_purchase", "Vehicle Purchase", "Buying a vehicle together"],
      ["family_support", "Family Support", "Shared family responsibilities and support"],
      ["shared_savings", "Shared Savings", "Saving towards a common financial goal"],
      ["community_project", "Community Project", "Collective projects and community needs"],
      ["other_goal", "Other Goal", "Another shared goal or objective"],
    ],
  },
  chama: {
    label: "Chama",
    description: "Organise regular contributions, rotating payouts, pooled savings or investments.",
    types: [
      ["rotating_savings", "Rotating Savings (Merry-Go-Round)", "Members contribute regularly and take turns receiving the pooled amount"],
      ["table_banking", "Table Banking", "Members contribute to a pool that can support member loans"],
      ["accumulating_savings", "Accumulating Savings", "Build a shared pool through regular contributions"],
      ["investment_chama", "Investment Chama", "Pool resources for assets, investments or a shared venture"],
      ["other_chama", "Other Chama", "Another organised savings or cooperative arrangement"],
    ],
  },
} as const;

type Category = keyof typeof catalogue;
const frequencies = [
  ["one_time", "One-time"],
  ["weekly", "Weekly"],
  ["biweekly", "Every two weeks"],
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["annually", "Annually"],
] as const;
const steps = [
  { title: "Identity", description: "Start with the basics" },
  { title: "Type", description: "Choose your group arrangement" },
  { title: "Contributions", description: "Set the financial and timing details" },
  { title: "Review", description: "Check everything before creating" },
];

export function GroupCreationForm({ error }: { error?: string }) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category>("event");
  const [groupType, setGroupType] = useState<string>("birthday");
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [targetAmount, setTargetAmount] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [frequency, setFrequency] = useState("");
  const types = catalogue[category].types;
  const selectedType = useMemo(() => types.find(([value]) => value === groupType), [types, groupType]);
  const isChama = category === "chama";
  const isEvent = category === "event";
  const frequencyRequired = isChama && ["rotating_savings", "table_banking", "accumulating_savings"].includes(groupType);
  const showFrequency = isChama || ["rent_housing", "education", "shared_savings"].includes(groupType);

  function chooseCategory(value: Category) {
    setCategory(value);
    setGroupType(catalogue[value].types[0][0]);
    setFrequency("");
  }

  function continueToNextStep() {
    const panel = document.getElementById(`ak-create-step-${step}`);
    const fields = panel?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
    if (fields) {
      for (const field of Array.from(fields)) {
        if (field.type === "file" || field.disabled) continue;
        if (!field.checkValidity()) {
          field.reportValidity();
          field.focus();
          return;
        }
      }
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <form action={createGroup} className="auth-form ak-create-form">
      {error && <p className="auth-error" role="alert">{error}</p>}

      <div className="ak-create-progress" aria-label={`Step ${step + 1} of 4`}>
        <div className="ak-create-progress-top"><span>STEP {step + 1} OF 4</span><strong>{steps[step].title}</strong></div>
        <div className="ak-create-progress-track" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1}>
          <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="ak-create-step-labels">
          {steps.map((item, index) => <span key={item.title} className={index <= step ? "active" : ""}>{item.title}</span>)}
        </div>
        <p>{steps[step].description}</p>
      </div>

      <section id="ak-create-step-0" className="ak-create-section" hidden={step !== 0}>
        <div className="ak-create-section-heading"><span>01</span><div><h2>Give your group an identity</h2><p>Choose a name and tell people what this group is about.</p></div></div>
        <label>Group name <em>Required</em><input name="name" value={groupName} onChange={(event) => setGroupName(event.target.value)} maxLength={80} required placeholder="e.g. John's 30th Birthday" /></label>
        <label>About this group <small>Optional</small><textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="Tell members what this group is about..." /></label>
        <label>Group image <small>Optional · JPG, PNG or WebP · up to 5 MB</small><input name="group_image" type="file" accept="image/png,image/jpeg,image/webp" /></label>
      </section>

      <section id="ak-create-step-1" className="ak-create-section" hidden={step !== 1}>
        <div className="ak-create-section-heading"><span>02</span><div><h2>What kind of group is this?</h2><p>Choose the arrangement that best describes what you are creating.</p></div></div>
        <input type="hidden" name="purpose" value={category} />
        <div className="ak-category-options">
          {(Object.keys(catalogue) as Category[]).map((key) => (
            <button type="button" key={key} className={"ak-category-option " + (category === key ? "selected" : "")} onClick={() => chooseCategory(key)} aria-pressed={category === key}>
              <span className="ak-category-symbol">{key === "event" ? "✳" : key === "goal" ? "◎" : "↻"}</span>
              <strong>{catalogue[key].label}</strong>
              <small>{catalogue[key].description}</small>
            </button>
          ))}
        </div>
        <label>Group type <em>Required</em><select name="group_type" value={groupType} onChange={(event) => { setGroupType(event.target.value); setFrequency(""); }} required>
          {types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select><small>{selectedType?.[2]}</small></label>
      </section>

      <section id="ak-create-step-2" className="ak-create-section" hidden={step !== 2}>
        <div className="ak-create-section-heading"><span>03</span><div><h2>Contributions & timing</h2><p>Only add the details that make sense for this group. You can update optional details later.</p></div></div>
        <label>Group currency <em>Required</em><input name="currency_code" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} minLength={3} maxLength={3} pattern="[A-Za-z]{3}" required placeholder="e.g. KES" autoCapitalize="characters" /><small>Three-letter currency code, such as KES, USD or GBP.</small></label>
        <label>Target amount <small>Optional</small><input name="target_amount" type="number" min="0.01" step="0.01" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="e.g. 100000" /><small>A shared target, not an amount each member is automatically required to pay.</small></label>
        {isEvent && <label>Event date <small>Optional</small><input name="event_date" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>}
        <label>{isEvent ? "Contribution deadline" : "Goal deadline"} <small>Optional</small><input name="deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /><small>{isEvent ? "When you would ideally like contributions completed. This can differ from the event date." : "When you hope to achieve this goal."}</small></label>
        {showFrequency && <label>Contribution frequency {frequencyRequired && <em>Required</em>}<select name="contribution_frequency" value={frequency} onChange={(event) => setFrequency(event.target.value)} required={frequencyRequired}><option value="">Choose a frequency</option>{frequencies.filter(([value]) => !frequencyRequired || value !== "one_time").map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><small>{isChama ? "How often members are expected to contribute under the group's arrangement." : "If contributions will be made regularly, select the expected interval."}</small></label>}
      </section>

      <section id="ak-create-step-3" className="ak-create-section ak-create-access" hidden={step !== 3}>
        <div className="ak-create-section-heading"><span>04</span><div><h2>Review your group</h2><p>Make sure the details look right. You can go back to change anything.</p></div></div>
        <div className="ak-create-review">
          <div><small>GROUP NAME</small><strong>{groupName.trim() || "Not provided"}</strong></div>
          {description.trim() && <div><small>ABOUT</small><span>{description}</span></div>}
          <div><small>GROUP TYPE</small><strong>{catalogue[category].label} · {selectedType?.[1]}</strong></div>
          <div><small>CURRENCY</small><strong>{currency || "KES"}</strong></div>
          {targetAmount && <div><small>TARGET AMOUNT</small><strong>{currency} {Number(targetAmount).toLocaleString()}</strong></div>}
          {eventDate && <div><small>EVENT DATE</small><strong>{eventDate}</strong></div>}
          {deadline && <div><small>DEADLINE</small><strong>{deadline}</strong></div>}
          {frequency && <div><small>CONTRIBUTION FREQUENCY</small><strong>{frequencies.find(([value]) => value === frequency)?.[1] ?? frequency}</strong></div>}
        </div>
        <div className="ak-private-note"><span>♙</span><div><strong>Private group</strong><small>Only people you invite will be able to access this group. You can invite members after creating it.</small></div></div>
        <p className="ak-create-footnote">You’ll become the group administrator. Creating a group does not move or hold money. Contributions, payments and invitations are separate features.</p>
      </section>

      <div className="ak-create-navigation">
        {step > 0 ? <button className="ak-create-back" type="button" onClick={() => setStep((current) => current - 1)}>← Back</button> : <span />}
        {step < steps.length - 1
          ? <button className="workspace-primary" type="button" onClick={continueToNextStep}>Continue <span aria-hidden="true">→</span></button>
          : <button className="workspace-primary" type="submit">Create Group <span aria-hidden="true">→</span></button>}
      </div>
    </form>
  );
}
