import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import {
  Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const green = '#2D6B4D';
const ink = '#24332B';
const muted = '#69766B';

export default function App() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('카메라 권한이 필요해요', '설정에서 카메라 접근을 허용한 뒤 다시 시도해 주세요.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch {
      Alert.alert('사진을 찍지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }

  async function choosePhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch {
      Alert.alert('사진을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.mark}><Text style={styles.markText}>살</Text></View>
              <View>
                <Text style={styles.brand}>살림</Text>
                <Text style={styles.caption}>혼자 사는 날의 작은 도움</Text>
              </View>
              <View style={styles.badge}><Text style={styles.badgeText}>준비 중</Text></View>
            </View>

            <View style={styles.hero}>
              <Text style={styles.eyebrow}>생활 속 궁금증, 사진 한 장부터</Text>
              <Text style={styles.title}>이건 어떻게{'\n'}버리고 관리할까요?</Text>
              <Text style={styles.subtitle}>분리수거가 헷갈리는 물건이나 자취 중 생긴 문제를 사진과 함께 남겨 보세요.</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <View style={styles.number}><Text style={styles.numberText}>1</Text></View>
                <Text style={styles.sectionTitle}>사진 추가</Text>
              </View>
              {photoUri ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
                  <Pressable accessibilityRole="button" accessibilityLabel="선택한 사진 제거" style={styles.removePhoto} onPress={() => setPhotoUri(null)}>
                    <Text style={styles.removePhotoText}>✕</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.emptyPhoto}>
                  <Text style={styles.emptyPhotoIcon}>▧</Text>
                  <Text style={styles.emptyPhotoTitle}>궁금한 물건을 보여 주세요</Text>
                  <Text style={styles.emptyPhotoHint}>물건 전체가 잘 보이게 찍으면 좋아요</Text>
                </View>
              )}
              <View style={styles.photoActions}>
                <Pressable style={[styles.photoButton, styles.cameraButton]} onPress={takePhoto}>
                  <Text style={styles.cameraButtonText}>사진 찍기</Text>
                </Pressable>
                <Pressable style={[styles.photoButton, styles.galleryButton]} onPress={choosePhoto}>
                  <Text style={styles.galleryButtonText}>앨범에서 선택</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <View style={styles.number}><Text style={styles.numberText}>2</Text></View>
                <Text style={styles.sectionTitle}>상황 설명</Text>
              </View>
              <TextInput
                accessibilityLabel="상황 설명 입력"
                style={styles.input}
                multiline
                maxLength={500}
                placeholder="예: 음식물이 묻은 플라스틱 용기인데 씻어도 얼룩이 남아요."
                placeholderTextColor="#9AA69B"
                textAlignVertical="top"
                value={question}
                onChangeText={setQuestion}
              />
              <Text style={styles.counter}>{question.length}/500</Text>
            </View>

            <View style={styles.notice}>
              <Text style={styles.noticeIcon}>ⓘ</Text>
              <Text style={styles.noticeText}>
                {photoUri || question.trim()
                  ? '질문이 준비됐어요. 사진 분석과 지역별 배출 안내는 서버 연결 후 제공됩니다.'
                  : '사진이나 설명을 추가해 보세요. 답변 기능은 현재 개발 중입니다.'}
              </Text>
            </View>
            <View style={styles.examples}>
              <Text style={styles.examplesTitle}>이런 질문을 할 수 있어요</Text>
              <Text style={styles.exampleText}>“배달 용기 뚜껑도 같이 버려도 되나요?”</Text>
              <Text style={styles.exampleText}>“이 옷의 얼룩은 어떻게 지우나요?”</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#F8F7F2' },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  mark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: green },
  markText: { color: '#fff', fontWeight: '800', fontSize: 19 },
  brand: { color: ink, fontSize: 18, fontWeight: '800', lineHeight: 21 },
  caption: { color: muted, fontSize: 10, marginTop: 2 },
  badge: { marginLeft: 'auto', backgroundColor: '#E8F2E7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  badgeText: { color: green, fontSize: 11, fontWeight: '700' },
  hero: { paddingTop: 6, paddingBottom: 8 },
  eyebrow: { color: green, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 10 },
  title: { color: ink, fontSize: 29, fontWeight: '800', lineHeight: 38, letterSpacing: -1.1 },
  subtitle: { color: muted, fontSize: 14, lineHeight: 22, marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#E4E9E0' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 16 },
  number: { width: 25, height: 25, borderRadius: 8, backgroundColor: '#E8F2E7', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: green, fontWeight: '800', fontSize: 13 },
  sectionTitle: { color: ink, fontWeight: '800', fontSize: 16 },
  emptyPhoto: { height: 160, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9D9C9', backgroundColor: '#FAFCF8', alignItems: 'center', justifyContent: 'center' },
  emptyPhotoIcon: { color: green, fontSize: 30, marginBottom: 8 },
  emptyPhotoTitle: { color: ink, fontWeight: '700', fontSize: 14 },
  emptyPhotoHint: { color: muted, fontSize: 12, marginTop: 5 },
  previewWrap: { height: 200, borderRadius: 16, overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(20, 30, 23, 0.8)', alignItems: 'center', justifyContent: 'center' },
  removePhotoText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  photoActions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  photoButton: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cameraButton: { backgroundColor: green },
  galleryButton: { backgroundColor: '#E8F2E7' },
  cameraButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  galleryButtonText: { color: green, fontWeight: '800', fontSize: 13 },
  input: { minHeight: 96, borderRadius: 14, backgroundColor: '#F7F9F5', paddingHorizontal: 14, paddingVertical: 13, color: ink, fontSize: 14, lineHeight: 21 },
  counter: { color: muted, fontSize: 11, alignSelf: 'flex-end', marginTop: 7 },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF5E9', borderRadius: 14, padding: 13 },
  noticeIcon: { color: '#A76128', fontSize: 17, lineHeight: 20 },
  noticeText: { flex: 1, color: '#815638', fontSize: 12, lineHeight: 19 },
  examples: { paddingHorizontal: 2, paddingTop: 5, gap: 9 },
  examplesTitle: { color: ink, fontWeight: '800', fontSize: 14, marginBottom: 2 },
  exampleText: { color: muted, fontSize: 12, lineHeight: 18 },
});
