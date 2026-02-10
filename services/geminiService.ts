
import { GoogleGenAI } from "@google/genai";
import { GeometryData, HatchedArea } from "../types";

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
      1. Tọa độ (x, y) phải nằm trong khoảng (50, 50) đến (350, 350) để hình vẽ cân đối trong khung 400x400.
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

  async identifyClosedArea(data: GeometryData, clickX: number, clickY: number, apiKey?: string, modelId: string = 'gemini-2.5-pro'): Promise<HatchedArea | null> {
    const ai = getAI(apiKey);
    const prompt = `
      PHÂN TÍCH HÌNH HỌC KHÔNG GIAN:
      Dữ liệu hình vẽ hiện tại: ${JSON.stringify(data)}
      Người dùng click vào tọa độ: (x=${clickX.toFixed(2)}, y=${clickY.toFixed(2)})

      YÊU CẦU:
      1. Tìm vùng kín (đa giác hoặc hình quạt/viên phân) NHỎ NHẤT bao quanh điểm click.
      2. Biên giới của vùng phải được cấu thành từ các đoạn thẳng (lines) HOẶC cung tròn (circles) đã vẽ.
      3. ĐIỀU KIỆN QUAN TRỌNG: Bên trong vùng này TUYỆT ĐỐI không được có bất kỳ đường kẻ hay điểm nào khác đi xuyên qua.
      4. Nếu biên giới là một cung tròn, bạn phải xác định type là "arc", cung cấp "centerId", "isLargeArc" và "isClockwise" để UI vẽ đúng bằng SVG Path.
      5. "segments" phải là một mảng các đoạn nối tiếp nhau tạo thành chu vi kín.

      TRẢ VỀ JSON:
      {
        "area": {
          "id": "identified_area",
          "pointIds": ["A", "B", "C"],
          "segments": [
            { "p1": "A", "p2": "B", "type": "line" },
            { "p1": "B", "p2": "C", "type": "arc", "centerId": "O", "isLargeArc": false, "isClockwise": true },
            { "p1": "C", "p2": "A", "type": "line" }
          ],
          "label": "Vùng ABC",
          "isSpecial": false
        }
      }
      Nếu không tìm thấy vùng kín hợp lệ (trống bên trong) bao quanh điểm click, trả về {"area": null}.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    try {
      const result = JSON.parse(response.text || "{}");
      return result.area || null;
    } catch (e) {
      console.error("Area Identification Error:", e);
      return null;
    }
  }
};
