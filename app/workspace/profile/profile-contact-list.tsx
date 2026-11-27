type Props = {
  emailAddress: string | null;
  emailVisible: boolean;
  phoneNumber: string | null;
  phoneVisible: boolean;
  location: string | null;
  locationVisible: boolean;
};

export function ProfileContactList(props: Props) {
  const rows = [
    { label: "Email", value: props.emailAddress, visible: props.emailVisible },
    { label: "Phone number", value: props.phoneNumber, visible: props.phoneVisible },
    { label: "Location", value: props.location, visible: props.locationVisible },
  ];

  return (
    <dl className="ak-public-profile-contacts">
      {rows.map((row) => (
        <div className="ak-public-profile-contact-row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.visible ? row.value || "Not provided" : <span className="ak-public-profile-private">Private</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
