import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const normalizeImages = (images) =>
  Array.isArray(images) ? images.filter(Boolean) : [];

export default function ImageCarousel({
  images = [],
  containerStyle,
  imageStyle,
  placeholder,
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(screenWidth);
  const scrollRef = useRef(null);
  const widthRef = useRef(screenWidth);
  const validImages = normalizeImages(images);
  const imageCount = validImages.length;

  const handleLayout = useCallback(({ nativeEvent }) => {
    const { width } = nativeEvent.layout;
    if (width && width !== widthRef.current) {
      widthRef.current = width;
      setContainerWidth(width);
    }
  }, []);

  const handleScroll = useCallback(
    (event) => {
      const width = widthRef.current || screenWidth || 1;
      const offset = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offset / width);
      if (nextIndex >= 0 && nextIndex < imageCount && nextIndex !== activeIndex) {
        setActiveIndex(nextIndex);
      }
    },
    [activeIndex, imageCount, screenWidth]
  );

  useEffect(() => {
    if (imageCount === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((prev) => (prev >= imageCount ? 0 : prev));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: 0, animated: false });
    }
  }, [imageCount]);

  if (imageCount === 0) {
    return (
      <View style={[styles.container, containerStyle]} onLayout={handleLayout}>
        {placeholder}
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]} onLayout={handleLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
      >
        {validImages.map((uri, index) => (
          <Image
            key={`${uri}-${index}`}
            source={{ uri }}
            style={[styles.image, imageStyle, { width: containerWidth }]}
          />
        ))}
      </ScrollView>
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {activeIndex + 1} / {imageCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
  },
  image: {
    height: '100%',
    resizeMode: 'cover',
  },
  counter: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
