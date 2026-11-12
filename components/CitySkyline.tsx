import { colors, artwork } from "../constants/theme";
import { createElement, useEffect, useRef, useState } from "react";
import { Animated, Image, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getCityLayout } from "../constants/cityLayout";
import { usePathname } from "expo-router";
import { useReducedMotion } from "../hooks/useReducedMotion";
import {
  isOnboardingCompleted,
  subscribeOnboardingState,
} from "../features/map/onboardingEvent";

const nativeDriver = Platform.OS !== "web";
const webEntrance = `
    [data-city-entrance="loading"], [data-city-entrance="posed"] {
      transform: translateY(95px);
    }
    [data-city-entrance="ready"] {
      animation: elas-city-rise 1000ms cubic-bezier(.32,.16,.36,1) both;
    }
    [data-city-layout="ready"] {
      transition: transform 750ms cubic-bezier(.32,.16,.36,1);
    }
    @keyframes elas-city-rise {
      from { transform: translateY(95px); }
      to { transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      [data-city-entrance] {
        transform: none;
      }
      [data-city-entrance="posed"] {
        opacity: 0.45;
      }
      [data-city-entrance="ready"] {
        animation: elas-city-appear 400ms ease-out both;
      }
      [data-city-layout="ready"] {
        transition: none;
      }
    }
    @keyframes elas-city-appear {
      from { opacity: 0.45; }
      to { opacity: 1; }
    }
`;

export function CitySkyline() {
  const { width, height } = useWindowDimensions();
  const path = usePathname();
  const reduced = useReducedMotion();
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingCompleted);
  const [imageReady, setImageReady] = useState(false);
  const [canRise, setCanRise] = useState(false);
  useEffect(() => subscribeOnboardingState(setOnboardingDone), []);
  useEffect(() => {
    if (nativeDriver || !imageReady) return;
    // Paint the loaded artwork in its lowered position before starting the rise.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setCanRise(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [imageReady]);
  const isWelcome =
    path === "/" ||
    ((path === "/login" || path === "/cadastro") && !onboardingDone);
  const { cityHeight, top } = getCityLayout(width, height, isWelcome);
  const offset = useRef(new Animated.Value(top)).current;
  const entered = useRef(false);
  useEffect(() => {
    if (!nativeDriver) return;
    if (reduced) {
      offset.setValue(top);
      return;
    }
    if (!entered.current) {
      offset.setValue(top + 95);
      entered.current = true;
    }
    const animation = Animated.spring(offset, {
      toValue: top,
      damping: 24,
      stiffness: 100,
      mass: 1.2,
      overshootClamping: true,
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [offset, reduced, top]);
  const webProps = nativeDriver ? {} : {
    dataSet: { cityEntrance: canRise ? "ready" : imageReady ? "posed" : "loading" },
  };
  const webLayoutProps = nativeDriver ? {} : {
    dataSet: { cityLayout: imageReady ? "ready" : "loading" },
  };
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.cream }]}
    >
      {!nativeDriver && createElement("style", null, webEntrance)}
      <Animated.View
        {...webLayoutProps}
        testID="city-motion"
        style={{ transform: [{ translateY: nativeDriver ? offset : top }] }}
      >
        <View {...webProps}>
          <View style={{ height: cityHeight, overflow: "hidden" }}>
            <Animated.View
              style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.08 }] }]}
            >
              <Image
                source={require("../assets/city-modern.jpg")}
                onLoad={nativeDriver ? undefined : () => setImageReady(true)}
                resizeMode="cover"
                style={{ width: "100%", height: "100%" }}
              />
            </Animated.View>
            <LinearGradient
              colors={[colors.cream, colors.cream, artwork.clearCream]}
              locations={[0, 0.12, 1]}
              style={{
                position: "absolute",
                top: -1,
                left: 0,
                right: 0,
                height: Math.min(100, cityHeight * 0.25),
              }}
            />
            <LinearGradient
              colors={[artwork.clearWine, colors.wine, colors.wine]}
              locations={[0, 0.88, 1]}
              style={{
                position: "absolute",
                bottom: -1,
                left: 0,
                right: 0,
                height: Math.min(140, cityHeight * 0.34),
              }}
            />
          </View>
          <View
            style={{
              height: height + 201,
              marginTop: -1,
              backgroundColor: colors.wine,
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}
