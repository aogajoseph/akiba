// Chat Component Data

export const contacts = [
  {
    id: 1,
    name: "Angela",
    avatar: "", // You can provide a URL to the avatar image
    lastMessage: "Thanks Dad, I will send...",
    online: true,
    messages: [
      {
        content: "Hi Angie, are you still working on the project?",
        isSender: true,
        timestamp: "10:00 AM",
      },
      {
        content: "I know you're doing a great job. Keep up the good work.",
        isSender: true,
        timestamp: "10:15 AM",
      },
      {
        content: "Thanks Dad, I will send the draft by the end of the day.",
        isSender: false,
        timestamp: "10:30 AM",
      },
    ],
  },
  {
    id: 2,
    name: "Don",
    avatar: "", // You can provide a URL to the avatar image
    lastMessage: "Daddy, I am thinking...",
    online: false,
    messages: [
      {
        content: "Hi Olivia, I am thinking about taking a vacation.",
        isSender: false,
        timestamp: "09:45 AM",
      },
      {
        content: "That sounds exciting, Katherine!",
        isSender: true,
        timestamp: "09:50 AM",
      },
    ],
  },
  {
    id: 3,
    name: "Martha",
    avatar: "", // You can provide a URL to the avatar image
    lastMessage: "Hey!",
    online: true,
    messages: [
      {
        content: "Hey!",
        isSender: false,
        timestamp: "11:00 AM",
      },
      {
        content: "Hi Phoenix, how are you?",
        isSender: true,
        timestamp: "11:05 AM",
      },
    ],
  },
  {
    id: 4,
    name: "Jose (You)",
    avatar: "", // You can provide a URL to the avatar image
    lastMessage: "Sent",
    online: false,
    messages: [
      {
        content: "Hey Olivia, I was thinking about doing some home improvement work.",
        isSender: false,
        timestamp: "08:30 AM",
      },
      {
        content: "That's a great idea, Eleanor!",
        isSender: true,
        timestamp: "08:45 AM",
      },
    ],
  },
];
