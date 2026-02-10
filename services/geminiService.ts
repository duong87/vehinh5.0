
import { GoogleGenAI } from "@google/genai";
import { GeometryData } from "../types";

const getAI = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error("Vui lòng nhập API Key!");
  }
  return new GoogleGenAI({ apiKey: key });
};

export const geminiService = {
  async generateGeometryCode(text: string, imageData?: string, apiKey?: string, modelId: string = 'gemini-2.5-pro'): Promise<GeometryData> {
    const ai = getAI(apiKey);
    const prompt = `
      Bạn là một chuyên gia Hình học phẳng và Kỹ sư đồ họa. 
      Nhiệm vụ của bạn là phân tích đề bài toán hình học và chuyển đổi nó thành một cấu trúc dữ liệu JSON để vẽ hình.

      Đề bài: "${text}"
      
      QUY TẮC TÍNH TOÁN TỌA ĐỘ:
      1. Tọa độ (x, y) phải nằm trong khoảng (50, 50) đến (350, 350).
         - QUY TẮC BẮT BUỘC: Nếu đề bài nhắc đến "nửa đường tròn" hoặc "đường tròn tâm O", MỌI ĐIỂM thuộc đường tròn PHẢI nằm ở NỬA TRÊN (y <= 200). 
         - Tâm O thường là (200, 200). Các điểm trên đường tròn phải có y < 200.
         - Ví dụ: Đường kính AB nằm ngang thì A(50, 200), B(350, 200). Điểm C trên đường tròn thì C(x, y) với y < 200.
         - KHÔNG ĐƯỢC lấy điểm ở nửa dưới (y > 200) cho các bài toán thông thường.
      2. Tính toán chính xác dựa trên các tính chất hình học.
      3. Nhãn điểm (label) theo chuẩn SGK Việt Nam (A, B, C, H, M, O...).
      4. labelOffsetX và labelOffsetY mặc định là 0.

      QUY TẮC KÝ HIỆU HÌNH HỌC:
      - Nếu có tia phân giác (ví dụ AD là phân giác góc A), hãy tạo 2 đối tượng trong mảng "angles": (B, A, D) và (D, A, C) với "isEqual": true.
      - Nếu đề bài cho 2 góc bằng nhau, hãy đánh dấu cả 2 góc đó với "isEqual": true.
      - "isRight": true dùng cho góc vuông (ký hiệu ô vuông).

      Cấu trúc JSON yêu cầu:
      {
        "points": [{ "id": "A", "label": "A", "x": 150, "y": 100, "labelOffsetX": 0, "labelOffsetY": -15 }, ...],
        "lines": [{ "id": "l1", "p1": "A", "p2": "B", "style": "solid" }, ...],
        "circles": [{ "id": "c1", "centerId": "O", "pointOnCircleId": "A" }, ...],
        "angles": [{ "id": "a1", "p1": "B", "vertex": "A", "p2": "C", "isRight": true, "isEqual": false }],
        "equalSegments": [{ "id": "e1", "p1": "A", "p2": "M", "count": 1 }],
        "hatchedAreas": []
      }
    `;

    const parts: any[] = [{ text: prompt }];
    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(",")[1],
        },
      });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      },
    });

    try {
      const text = response.text || "{}";
      const data = JSON.parse(text);
      return data as GeometryData;
    } catch (e) {
      console.error("JSON Parse Error:", response.text);
      throw new Error("Không thể tạo code hình học từ đề bài này.");
    }
  },


};
