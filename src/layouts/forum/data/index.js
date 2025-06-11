// Forum Component Data

export const groupChat = {
  id: 1,
  name: "Family Group",
  avatar: "https://i.pravatar.cc/150?img=20", // Random avatar URL
  lastMessage: "Thanks everyone for the updates.",
  lastMessageTime: "11:20 AM",
  online: true,
  unread: false,
  typing: false,
  lastSeen: "5 members online",
  description: "Family discussions, events, and updates",
  createdBy: "You",
  createdAt: "2023-01-15",
  members: [
    {
      id: 1,
      name: "You",
      avatar: "https://i.pravatar.cc/150?img=8",
      online: true,
      role: "admin"
    },
    {
      id: 2,
      name: "Angela",
      avatar: "https://i.pravatar.cc/150?img=5",
      online: true,
      role: "member"
    },
    {
      id: 3,
      name: "Don",
      avatar: "https://i.pravatar.cc/150?img=12",
      online: false,
      role: "member"
    },
    {
      id: 4,
      name: "Martha",
      avatar: "https://i.pravatar.cc/150?img=9",
      online: true,
      role: "member"
    },
    {
      id: 5,
      name: "Mom",
      avatar: "https://i.pravatar.cc/150?img=3",
      online: true,
      role: "member"
    },
    {
      id: 6,
      name: "Dad",
      avatar: "https://i.pravatar.cc/150?img=13",
      online: false,
      role: "member"
    }
  ],
  messages: [
    {
      type: "system",
      content: "You created this group",
      timestamp: "Monday",
    },
    {
      type: "system",
      content: "You added Angela, Don, Martha, Mom, and Dad",
      timestamp: "Monday",
    },
    {
      sender: "You",
      content: "Hey everyone! I created this group for family updates.",
      timestamp: "Monday, 10:30 AM",
      isSender: true,
      status: "read",
    },
    {
      sender: "Angela",
      content: "Hi everyone, I just submitted the project!",
      timestamp: "10:30 AM",
      isSender: false,
    },
    {
      sender: "Don",
      content: "Great job, Angie! I'm thinking of taking some time off next month.",
      timestamp: "10:45 AM",
      isSender: false,
    },
    {
      sender: "Martha",
      content: "Sounds good, Don. Maybe we can plan a family trip?",
      timestamp: "11:00 AM",
      isSender: false,
      reactions: [
        { emoji: "👍", user: "You" },
        { emoji: "❤️", user: "Angela" },
        { emoji: "🎉", user: "Don" },
      ],
    },
    {
      sender: "You",
      content: "That's a great idea. Let's discuss over the weekend.",
      timestamp: "11:15 AM",
      isSender: true,
      status: "read",
    },
    {
      sender: "Angela",
      content: "Thanks everyone for the updates.",
      timestamp: "11:20 AM",
      isSender: false,
    },
    {
      sender: "Mom",
      content: "I was thinking we could have dinner at our place this Sunday.",
      timestamp: "Yesterday, 3:45 PM",
      isSender: false,
    },
    {
      sender: "Dad",
      content: "Great idea! What time should we come over?",
      timestamp: "Yesterday, 4:00 PM",
      isSender: false,
    },
    {
      sender: "Mom",
      content: "How about 6:00 PM? I'll make everyone's favorites.",
      timestamp: "Yesterday, 4:15 PM",
      isSender: false,
      attachmentType: "image",
      attachmentUrl: "https://source.unsplash.com/random/300x200/?dinner",
    },
    {
      sender: "Angela",
      content: "I'll bring dessert!",
      timestamp: "Yesterday, 4:30 PM",
      isSender: false,
      reactions: [
        { emoji: "👍", user: "You" },
        { emoji: "❤️", user: "Mom" },
        { emoji: "🎉", user: "Dad" },
      ],
    },
    {
      sender: "You",
      content: "Sounds perfect! I'll bring some wine.",
      timestamp: "Yesterday, 5:00 PM",
      isSender: true,
      status: "read",
    },
    {
      sender: "Don",
      content: "I might be a bit late, but I'll definitely be there.",
      timestamp: "Today, 9:30 AM",
      isSender: false,
    },
    {
      type: "system",
      content: "Martha shared a location",
      timestamp: "Today, 10:00 AM",
    },
    {
      sender: "Martha",
      content: "Here's the location for the new restaurant I was telling you all about. Maybe we can try it next time?",
      timestamp: "Today, 10:01 AM",
      isSender: false,
      attachmentType: "location",
      attachmentUrl: "https://source.unsplash.com/random/300x200/?map",
    },
  ],
};

export const otherGroups = [
  {
    id: 2,
    name: "Work Team",
    avatar: "https://i.pravatar.cc/150?img=30",
    lastMessage: "Boss: Meeting at 3pm",
    lastMessageTime: "1:30 PM",
    online: true,
    unread: true,
    unreadCount: 3,
    typing: true,
    lastSeen: "3 members online",
    description: "Work-related discussions and updates",
    members: [
      {
        id: 1,
        name: "You",
        avatar: "https://i.pravatar.cc/150?img=8",
        online: true,
        role: "member"
      },
      {
        id: 7,
        name: "Boss",
        avatar: "https://i.pravatar.cc/150?img=11",
        online: true,
        role: "admin"
      },
      {
        id: 8,
        name: "Sarah",
        avatar: "https://i.pravatar.cc/150?img=6",
        online: true,
        role: "member"
      },
      {
        id: 9,
        name: "Mike",
        avatar: "https://i.pravatar.cc/150?img=15",
        online: false,
        role: "member"
      }
    ],
    messages: [
      {
        sender: "Boss",
        content: "Team, we have a meeting at 3pm today to discuss the new project.",
        timestamp: "1:30 PM",
        isSender: false,
      },
      {
        sender: "You",
        content: "I'll be there.",
        timestamp: "1:32 PM",
        isSender: true,
        status: "read",
      },
      {
        sender: "Boss",
        content: "Here's the agenda",
        timestamp: "1:35 PM",
        isSender: false,
        attachmentType: "file",
        attachmentUrl: "",
      },
    ],
  },
  {
    id: 3,
    name: "Akiba Savings Group",
    avatar: "https://i.pravatar.cc/150?img=32",
    lastMessage: "John: I've made my contribution for this month",
    lastMessageTime: "Yesterday",
    online: true,
    unread: true,
    unreadCount: 12,
    typing: false,
    lastSeen: "8 members online",
    description: "Group for managing our shared savings and investments",
    members: [
      {
        id: 1,
        name: "You",
        avatar: "https://i.pravatar.cc/150?img=8",
        online: true,
        role: "admin"
      },
      {
        id: 10,
        name: "John",
        avatar: "https://i.pravatar.cc/150?img=17",
        online: true,
        role: "member"
      },
      {
        id: 11,
        name: "Lisa",
        avatar: "https://i.pravatar.cc/150?img=7",
        online: false,
        role: "member"
      },
      {
        id: 12,
        name: "Mark",
        avatar: "https://i.pravatar.cc/150?img=14",
        online: true,
        role: "member"
      }
    ],
    messages: [
      {
        sender: "You",
        content: "Welcome to our Akiba Savings Group! This is where we'll coordinate our monthly contributions and discuss investment opportunities.",
        timestamp: "Last week",
        isSender: true,
        status: "read",
      },
      {
        sender: "John",
        content: "Thanks for setting this up! I'm excited to start saving together.",
        timestamp: "Last week",
        isSender: false,
      },
      {
        sender: "Lisa",
        content: "Me too! When are the monthly contributions due?",
        timestamp: "Last week",
        isSender: false,
      },
      {
        sender: "You",
        content: "We'll collect contributions on the 5th of each month. Here's the schedule and target amounts.",
        timestamp: "Last week",
        isSender: true,
        status: "read",
        attachmentType: "file",
        attachmentUrl: "",
      },
      {
        sender: "John",
        content: "I've made my contribution for this month",
        timestamp: "Yesterday",
        isSender: false,
        reactions: [
          { emoji: "👍", user: "You" },
          { emoji: "🎉", user: "Lisa" },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "Neighborhood Watch",
    avatar: "https://i.pravatar.cc/150?img=25",
    lastMessage: "Security alert: Please be cautious...",
    lastMessageTime: "2 days ago",
    online: true,
    unread: false,
    typing: false,
    lastSeen: "15 members online",
    description: "Community safety and neighborhood updates",
    messages: [
      {
        type: "system",
        content: "James added you to the group",
        timestamp: "2 weeks ago",
      },
      {
        sender: "James",
        content: "Welcome to our neighborhood watch group! We use this to share security updates and community information.",
        timestamp: "2 weeks ago",
        isSender: false,
      },
      {
        sender: "Security Officer",
        content: "Security alert: Please be cautious when walking at night. There have been reports of suspicious activity near the park.",
        timestamp: "2 days ago",
        isSender: false,
        reactions: [
          { emoji: "👍", user: "You" },
          { emoji: "🙏", user: "James" },
          { emoji: "👀", user: "Karen" },
        ],
      },
    ],
  }
];
