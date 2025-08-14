import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ChatThreadScreen({ navigation, route }) {
  const { chat } = route.params;
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello!', sender: 'them' },
    { id: '2', text: 'Hey, how’s it going?', sender: 'me' }
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), text: input, sender: 'me' }]);
    setInput('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} // adjust for tab bar height
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" style={{ marginRight: 8 }} />
          </TouchableOpacity>
          <Image source={chat.avatar} style={styles.avatar} />
          <View>
            <Text style={styles.chatName}>{chat.name}</Text>
            <Text style={styles.chatRole}>{chat.role}</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 8 }}
          keyboardShouldPersistTaps="handled"
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8
  },
  chatName: {
    fontWeight: '700'
  },
  chatRole: {
    fontSize: 12,
    color: '#666'
  },
  messageBubble: {
    marginVertical: 4,
    padding: 10,
    borderRadius: 8,
    maxWidth: '80%'
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
