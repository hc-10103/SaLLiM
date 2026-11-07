import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";

// 카메라/앨범에서 사진 한 장 → 긴 변 1024px, JPEG 0.7 → base64. 취소/권한 거부면 null.
export async function pickImageBase64(source: "camera" | "library"): Promise<string | null> {
  if (Platform.OS !== "web") {
    const perm = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error("권한이 필요해요. 설정에서 허용해 주세요.");
  }

  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, base64: Platform.OS === "web" };
  const res =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled) return null;

  const asset = res.assets[0];
  const isHeic = /(?:image\/(?:heic|heif)|\.(?:heic|heif)$)/i.test(
    `${asset.mimeType ?? ""} ${asset.fileName ?? ""}`,
  );
  let sourceUri = asset.uri;
  let temporaryUrl: string | null = null;

  try {
    if (Platform.OS === "web" && isHeic) {
      if (!asset.file) throw new Error("HEIC 사진 파일을 읽지 못했어요.");
      try {
        const { heicTo } = await import("heic-to");
        const jpeg = await heicTo({ blob: asset.file, type: "image/jpeg", quality: 0.8 });
        temporaryUrl = URL.createObjectURL(jpeg);
        sourceUri = temporaryUrl;
      } catch {
        throw new Error("HEIC 사진을 변환하지 못했어요. 다른 사진을 선택하거나 JPG로 내보낸 뒤 다시 시도해 주세요.");
      }
    } else if (Platform.OS === "web") {
      if (!asset.base64) throw new Error("사진을 읽지 못했어요. 다시 선택해 주세요.");
      sourceUri = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
    }

    const long = Math.max(asset.width, asset.height);
    const resize = long > 1024 ? [{ resize: asset.width >= asset.height ? { width: 1024 } : { height: 1024 } }] : [];
    const out = await manipulateAsync(sourceUri, resize, { compress: 0.7, format: SaveFormat.JPEG, base64: true });
    if (!out.base64) throw new Error("사진을 JPEG로 변환하지 못했어요. 다시 선택해 주세요.");
    return out.base64;
  } catch (error) {
    if (Platform.OS === "web" && error instanceof Error && error.message.includes("Failed to load the image")) {
      throw new Error("이 사진을 읽지 못했어요. JPG·PNG 또는 다른 HEIC 사진으로 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
  }
}
