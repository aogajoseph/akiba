import { View, Text, TouchableOpacity, Image, Modal } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({ navigation, options }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top, // Safe area for top
        height: 56 + insets.top,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#E8F3F1',
      }}
    >
      {/* Hamburger */}
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        accessibilityLabel="Open menu"
      >
        <Text style={{ fontSize: 24 }}>☰</Text>
      </TouchableOpacity>

      {/* Brand */}
      <Text style={{ fontSize: 18, fontWeight: '700' }}>
        {options?.title || 'Akiba'}
      </Text>

      {/* Avatar */}
      <TouchableOpacity onPress={() => setMenuOpen(true)}>
        <Image
          source={{ uri: 'https://i.pravatar.cc/80?img=12' }} // placeholder
          style={{ width: 28, height: 28, borderRadius: 14 }}
        />
      </TouchableOpacity>

      {/* Avatar dropdown */}
      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setMenuOpen(false)}>
          <View
            style={{
              position: 'absolute',
              right: 10,
              top: 56 + insets.top,
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 12,
              elevation: 4,
              width: 220,
            }}
          >
            <Text style={{ fontWeight: '700', marginBottom: 6 }}>Mama Jacky</Text>
            <Text style={{ color: '#666', marginBottom: 12 }}>Role: Main Admin</Text>

            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate('Profile');
              }}
            >
              <Text style={{ paddingVertical: 8 }}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate('Settings');
              }}
            >
              <Text style={{ paddingVertical: 8 }}>Profile Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                // TODO logout logic
              }}
            >
              <Text style={{ paddingVertical: 8, color: '#c00' }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
2