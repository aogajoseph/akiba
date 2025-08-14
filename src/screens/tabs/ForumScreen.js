import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  SafeAreaView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

export default function ForumScreen({ navigation }) {
  const [messages, setMessages] = useState([
    { id: '1', text: 'Welcome to the group!', sender: 'them', name: 'Admin' },
    { id: '2', text: 'Thanks! Glad to be here.', sender: 'me', name: 'Me' }
  ]);
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);
  const tabBarHeight = useBottomTabBarHeight();
  
  // No longer need keyboard listeners
  // and the keyboardVisible state since KeyboardAvoidingView handles this.

  useEffect(() => {
    // Scrolls to the end when the component mounts.
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now().toString(), text: input, sender: 'me', name: 'Me' };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f9f9' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#eee'
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" style={{ marginRight: 8 }} />
        </TouchableOpacity>
        <Image
          source={require('../../../assets/cover.jpg')}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: '#333', fontSize: 16 }}>Account Forum</Text>
          <Text style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
            Chat openly with all participants in this account.
          </Text>
          <Text style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>
            All participants in this account can see these messages.
          </Text>
          {/* Online Status */}
          <Text style={styles.onlineStatus}>
            7 Online
          </Text>
        </View>
      </View>

      {/* Messages + Input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // Adjusts the offset to accommodate the bottom tab bar.
        keyboardVerticalOffset={tabBarHeight}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 8, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                {
                  alignSelf: item.sender === 'me' ? 'flex-end' : 'flex-start',
                  backgroundColor: item.sender === 'me' ? '#DCF8C6' : '#fff'
                }
              ]}
            >
              {item.sender !== 'me' && (
                <Text style={styles.senderName}>{item.name}</Text>
              )}
              <Text>{item.text}</Text>
            </View>
          )}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message"
            style={styles.input}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Ionicons name="send" size={24} color="#25D366" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 8
  },
  chatName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#333'
  },
  chatRole: {
    fontSize: 12,
    color: '#666'
  },
  onlineStatus: {
    fontSize: 11,
    color: '#28a745',
    marginTop: 2
  },
  messageBubble: {
    marginVertical: 4,
    padding: 10,
    borderRadius: 8,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    marginBottom: 2
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 8
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8
  }
});