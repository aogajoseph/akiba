import { View, Text, TouchableOpacity, Image, Modal } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Local images
import logoImg from '../../assets/logo.png';
import profileImg from '../../assets/profile.png';

export default function Header({ navigation, options }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top,
        height: 56 + insets.top,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#E8F3F1',
      }}
    >
      {/* Left: Hamburger */}
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        accessibilityLabel="Open menu"
      >
        <Text style={{ fontSize: 24 }}>☰</Text>
      </TouchableOpacity>

      {/* Center: Logo + Brand */}
      <View
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          height: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Image
          source={logoImg}
          style={{ width: 22, height: 22, marginRight: 6 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 20, fontWeight: '700' }}>
          {options?.title || 'Akiba'}
        </Text>
      </View>

      {/* Right: Avatar */}
      <TouchableOpacity onPress={() => setMenuOpen(true)}>
        <Image
          source={profileImg}
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
              right: 5,
              top: 15 + insets.top, // slightly higher than before
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 12,
              elevation: 4,
              width: 220,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
          >
            {/* Bubble arrow */}
            <View
              style={{
                position: 'absolute',
                top: -8,
                right: 16,
                width: 16,
                height: 16,
                backgroundColor: 'white',
                transform: [{ rotate: '45deg' }],
                borderTopLeftRadius: 4,
              }}
            />

            <Text style={{ fontWeight: '700', marginBottom: 6 }}>Mama Jacky</Text>
            <Text style={{ color: '#666', marginBottom: 12 }}>Role: Main Admin</Text>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center' }}
              onPress={() => {
                setMenuOpen(false);
                // TODO logout logic
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#c00" style={{ marginRight: 6 }} />
              <Text style={{ paddingVertical: 8, color: '#c00' }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
