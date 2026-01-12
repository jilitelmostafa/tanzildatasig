
import { GoogleGenAI } from "@google/genai";

export const analyzeRegion = async (geojsonData: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // تلخيص البيانات لإرسالها للنموذج
  const features = geojsonData.features || [];
  const summary: Record<string, number> = {};
  
  features.slice(0, 100).forEach((f: any) => {
    const type = f.properties?.amenity || f.properties?.building || f.properties?.highway || 'other';
    summary[type] = (summary[type] || 0) + 1;
  });

  const prompt = `
    حلل البيانات الجغرافية التالية المستخرجة من OpenStreetMap لهذه المنطقة:
    - إجمالي العناصر: ${features.length}
    - توزيع الأصناف: ${JSON.stringify(summary)}
    
    المطلوب: قدم وصفاً موجزاً (3-4 جمل) باللغة العربية لطبيعة هذه المنطقة (هل هي تجارية، سكنية، صناعية، سياحية؟) وما هي أبرز معالمها بناءً على البيانات.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "تعذر تحليل المنطقة حالياً، لكن يمكنك معاينة البيانات يدوياً.";
  }
};
