// Chat Component Data

export const contacts = [
  {
    id: 1,
    name: "Angela",
    avatar: "https://i.pravatar.cc/150?img=5", // Random avatar URL
    lastMessage: "Thanks Dad, I will send...",
    lastMessageTime: "10:30 AM",
    online: true,
    unread: false,
    typing: false,
    lastSeen: "Online",
    messages: [
      {
        content: "Hi Angie, are you still working on the project?",
        isSender: true,
        timestamp: "10:00 AM",
        status: "read",
      },
      {
        content: "I know you're doing a great job. Keep up the good work.",
        isSender: true,
        timestamp: "10:15 AM",
        status: "read",
      },
      {
        type: "system",
        content: "Angela sent an attachment",
        timestamp: "10:20 AM",
      },
      {
        content: "Here's the draft I've been working on",
        isSender: false,
        sender: "Angela",
        timestamp: "10:25 AM",
        attachmentType: "file",
        attachmentUrl: "",
      },
      {
        content: "Thanks Dad, I will send the final version by the end of the day.",
        isSender: false,
        sender: "Angela",
        timestamp: "10:30 AM",
        reactions: [
          { emoji: "👍", user: "You" },
          { emoji: "❤️", user: "You" }
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Don",
    avatar: "https://i.pravatar.cc/150?img=12",
    lastMessage: "Daddy, I am thinking...",
    lastMessageTime: "09:45 AM",
    online: false,
    unread: true,
    unreadCount: 3,
    typing: false,
    lastSeen: "Last seen yesterday",
    messages: [
      {
        content: "Hi Dad, I am thinking about taking a vacation.",
        isSender: false,
        sender: "Don",
        timestamp: "Yesterday",
      },
      {
        content: "That sounds exciting, Don! Where are you planning to go?",
        isSender: true,
        timestamp: "Yesterday",
        status: "delivered",
      },
      {
        content: "I was thinking about going to the beach. Maybe Mombasa or Diani.",
        isSender: false,
        sender: "Don",
        timestamp: "09:30 AM",
        isFirstUnread: true,
      },
      {
        content: "What do you think?",
        isSender: false,
        sender: "Don",
        timestamp: "09:31 AM",
      },
      {
        content: "Also, can you help me with the budget?",
        isSender: false,
        sender: "Don",
        timestamp: "09:45 AM",
        attachmentType: "image",
        attachmentUrl: "https://source.unsplash.com/random/300x200/?beach",
      },
    ],
  },
  {
    id: 3,
    name: "Martha",
    avatar: "https://i.pravatar.cc/150?img=9",
    lastMessage: "Hey!",
    lastMessageTime: "11:00 AM",
    online: true,
    unread: false,
    typing: true,
    lastSeen: "Online",
    messages: [
      {
        content: "Hey!",
        isSender: false,
        sender: "Martha",
        timestamp: "11:00 AM",
      },
      {
        content: "Hi Martha, how are you?",
        isSender: true,
        timestamp: "11:05 AM",
        status: "sent",
        replyTo: {
          sender: "Martha",
          content: "Hey!",
        },
      },
    ],
  },
  {
    id: 4,
    name: "Jose (You)",
    avatar: "https://i.pravatar.cc/150?img=8",
    lastMessage: "Sent",
    lastMessageTime: "08:45 AM",
    online: false,
    unread: false,
    typing: false,
    lastSeen: "Last seen 2 hours ago",
    messages: [
      {
        content: "Hey Jose, I was thinking about doing some home improvement work.",
        isSender: false,
        sender: "Eleanor",
        timestamp: "08:30 AM",
        attachmentType: "video",
        attachmentUrl: "https://source.unsplash.com/random/300x200/?home",
      },
      {
        content: "That's a great idea! What kind of improvements are you considering?",
        isSender: true,
        timestamp: "08:45 AM",
        status: "read",
      },
    ],
  },
  {
    id: 5,
    name: "Forum",
    avatar: "https://i.pravatar.cc/150?img=20",
    lastMessage: "Mom: Dinner at 7pm",
    lastMessageTime: "12:15 PM",
    online: true,
    unread: true,
    unreadCount: 5,
    typing: false,
    lastSeen: "5 members online",
    isForumNotification: true, // Flag to indicate this is a notification from Forum
    messages: [
      {
        type: "system",
        content: "This is a notification from the Forum",
        timestamp: "Monday",
      },
      {
        type: "system",
        content: "Click to view all Forum messages",
        timestamp: "Monday",
      },
      {
        content: "New messages in the Forum. Click to view them in the Forum page.",
        isSender: false,
        sender: "System",
        timestamp: "12:15 PM",
      },
    ],
  }
];

// Additional data for message types
export const messageTypes = {
  text: "text",
  image: "image",
  video: "video",
  audio: "audio",
  file: "file",
  location: "location",
  contact: "contact",
  system: "system",
};
