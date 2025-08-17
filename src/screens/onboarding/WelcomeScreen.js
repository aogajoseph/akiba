import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  SafeAreaView,
  ImageBackground,
} from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Achieve more, Together.',
    description: 'Akiba is a collaborative savings platform that helps friends, families, and groups save and manage money as a team.',
    image: require('../../../assets/cover.jpg'),
  },
  {
    id: '2',
    title: 'Connect and Collaborate.',
    description: 'Chat privately with members, discuss openly in the forum and take part in electing officials.',
    image: require('../../../assets/cover.jpg'),
  },
  {
    id: '3',
    title: 'Transparent and Safe.',
    description: 'Your group always knows where the money is and how it’s being used.',
    image: require('../../../assets/cover.jpg'),
  },
];

export default function WelcomeScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event) => {
    const slideIndex = Math.round(
      event.nativeEvent.contentOffset.x / width
    );
    setCurrentIndex(slideIndex);
  };

  const renderItem = ({ item }) => (
    <ImageBackground source={item.image} style={styles.background}>
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.brandName}>Akiba</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </ImageBackground>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      />

      {/* Footer absolutely positioned on top */}
      <SafeAreaView style={styles.footerContainer}>
        <View style={styles.footer}>
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: index === currentIndex ? '#fbbc04' : '#ccc' },
                ]}
              />
            ))}
          </View>
          <View style={styles.buttons}>
            {!isLastSlide ? (
              <TouchableOpacity onPress={() => navigation.replace('SignUp')}>
                <Text style={styles.skip}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => navigation.replace('SignUp')}
              >
                <Text style={styles.startText}>Get Started</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // fallback behind image
  },
  background: {
    flex: 1, // makes the image stretch full height
    width,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 220
  },
  logo: {
    width: 75,
    height: 90,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#eee',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  footerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50, // ⬅️ lifted above controls
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttons: {
    width: '80%',
    alignItems: 'center',
  },
  skip: {
    fontSize: 16,
    color: '#fbbc04',
    fontWeight: '600',
    padding: 10,
  },
  startButton: {
    backgroundColor: '#fbbc04',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  startText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
