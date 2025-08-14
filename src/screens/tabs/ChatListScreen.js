import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal } from 'react-native';

const sampleChats = [
  {
    id: '1',
    name: 'Mama Jacky',
    role: 'Main Admin',
    lastMessage: 'Let’s finalize the deposit today.',
    time: '10:42 AM',
    unread: 2,
    avatar: require('../../../assets/profile.png')
  },
  {
    id: '2',
    name: 'John Doe',
    role: 'Member',
    lastMessage: 'Great, thanks for the update!',
    time: 'Yesterday',
    unread: 0,
    avatar: require('../../../assets/profile.png')
  }
];

export default function ChatListScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#333' }}>Private Chat</Text>
        <Text style={{ color: '#555', marginTop: 4, fontSize: 14, lineHeight: 20 }}>
          Chat privately with other participants in this account.
        </Text>
        <Text style={{ color: '#999', marginTop: 2, fontSize: 12, fontStyle: 'italic' }}>
          Only you and your recipient can see these messages.
        </Text>
      </View>

      {/* Chat list */}
      <FlatList
        data={sampleChats}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatThread', { chat: item })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#f0f0f0'
            }}
          >
            {/* Avatar click */}
            <TouchableOpacity onPress={() => setSelectedImage(item.avatar)}>
              <Image
                source={item.avatar}
                style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
              />
            </TouchableOpacity>

            {/* Chat info */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: '#666' }} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>

            {/* Time + unread */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#999', fontSize: 12 }}>{item.time}</Text>
              {item.unread > 0 && (
                <View
                  style={{
                    backgroundColor: '#25D366',
                    borderRadius: 12,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    marginTop: 4
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }}>{item.unread}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Full image modal */}
      <Modal visible={!!selectedImage} transparent onRequestClose={() => setSelectedImage(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Image source={selectedImage} style={{ width: 300, height: 300, borderRadius: 8 }} />
          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            style={{ marginTop: 20, padding: 10, backgroundColor: '#fff', borderRadius: 8 }}
          >
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
