import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Plus, Image as ImageIcon, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    interpolate, 
    Extrapolation,
    Easing
} from 'react-native-reanimated';

const { height } = Dimensions.get('window');

interface FabOverlayProps {
    isExpanded: boolean;
    onClose: () => void;
    onPressTrip: () => void;
    onPressPost: () => void;
}

export function FabOverlay({ isExpanded, onClose, onPressTrip, onPressPost }: FabOverlayProps) {
    const insets = useSafeAreaInsets();
    const animation = useSharedValue(0);

    useEffect(() => {
        const newValue = isExpanded ? 1 : 0;
        const duration = isExpanded ? 250 : 200;
        animation.value = withTiming(newValue, {
            duration,
            easing: Easing.out(Easing.quad),
        });
    }, [isExpanded, animation]);

    const backdropStyle = useAnimatedStyle(() => {
        const opacity = interpolate(animation.value, [0, 1], [0, 0.5], Extrapolation.CLAMP);
        return {
            opacity,
            display: animation.value === 0 ? 'none' : 'flex', 
        };
    });

    const tripButtonStyle = useAnimatedStyle(() => {
        const translateY = interpolate(animation.value, [0, 1], [0, -70], Extrapolation.CLAMP);
        const translateX = interpolate(animation.value, [0, 1], [0, -60], Extrapolation.CLAMP);
        const opacity = interpolate(animation.value, [0, 0.8, 1], [0, 1, 1], Extrapolation.CLAMP);
        return {
            transform: [{ translateY }, { translateX }],
            opacity,
            pointerEvents: animation.value < 0.9 ? 'none' : 'auto', 
        };
    });

    const postButtonStyle = useAnimatedStyle(() => {
        const translateY = interpolate(animation.value, [0, 1], [0, -70], Extrapolation.CLAMP);
        const translateX = interpolate(animation.value, [0, 1], [0, 60], Extrapolation.CLAMP);
        const opacity = interpolate(animation.value, [0, 0.8, 1], [0, 1, 1], Extrapolation.CLAMP);
        return {
            transform: [{ translateY }, { translateX }],
            opacity,
            pointerEvents: animation.value < 0.9 ? 'none' : 'auto',
        };
    });

    return (
        <>
            <Animated.View 
                style={[
                    {
                        position: 'absolute',
                        top: -height,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: height * 2,
                        backgroundColor: 'black',
                        zIndex: 40, 
                        elevation: 40,
                    },
                    backdropStyle
                ]}
            >
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={{ flex: 1 }} />
                </TouchableWithoutFeedback>
            </Animated.View>

            <View 
                className="absolute left-0 right-0 items-center justify-center" 
                style={{ 
                    bottom: 50 + insets.bottom, 
                    zIndex: 60, 
                    elevation: 60,
                    pointerEvents: 'box-none'
                }}
            >
                <Animated.View style={[tripButtonStyle, { position: 'absolute', zIndex: 61 }]}>
                    <TouchableOpacity 
                        onPress={onPressTrip}
                        className="items-center justify-center w-20 h-20"
                        activeOpacity={0.8}
                    >
                        <View className="bg-white w-14 h-14 rounded-full items-center justify-center shadow-lg border border-gray-100 mb-1 pointer-events-none">
                            <MapPin size={24} color="#094772" />
                        </View>
                        <View className="bg-white/90 px-2 py-1 rounded-md shadow-sm pointer-events-none">
                            <Text className="text-[10px] font-bold text-gray-700">Trip</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[postButtonStyle, { position: 'absolute', zIndex: 61 }]}>
                    <TouchableOpacity 
                        onPress={onPressPost}
                        className="items-center justify-center w-20 h-20"
                        activeOpacity={0.8}
                    >
                        <View className="bg-white w-14 h-14 rounded-full items-center justify-center shadow-lg border border-gray-100 mb-1 pointer-events-none">
                            <ImageIcon size={24} color="#094772" />
                        </View>
                        <View className="bg-white/90 px-2 py-1 rounded-md shadow-sm pointer-events-none">
                            <Text className="text-[10px] font-bold text-gray-700">Post</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </>
    );
}

interface FabTriggerProps {
    isExpanded: boolean;
    onToggle: () => void;
}

export function FabTrigger({ isExpanded, onToggle }: FabTriggerProps) {
    const animation = useSharedValue(0);

    useEffect(() => {
        const newValue = isExpanded ? 1 : 0;
        const duration = isExpanded ? 250 : 200;
        animation.value = withTiming(newValue, {
            duration,
            easing: Easing.out(Easing.quad),
        });
    }, [isExpanded, animation]);

    const plusStyle = useAnimatedStyle(() => {
        const rotate = interpolate(animation.value, [0, 1], [0, 45], Extrapolation.CLAMP);
        return {
            transform: [{ rotate: `${rotate}deg` }],
        };
    });

    return (
        <View className="items-center justify-center -mt-12 z-50">
            <TouchableOpacity
                onPress={onToggle}
                activeOpacity={0.9}
            >
                <Animated.View style={plusStyle} className="bg-[#094772] w-16 h-16 rounded-full items-center justify-center shadow-lg border-[6px] border-[#f5f5f5]">
                    <Plus size={32} color="white" strokeWidth={2.5} />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
}
