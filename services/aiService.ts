
import { GoogleGenAI } from "@google/genai";

export const analyzeRegion = async (geojsonData: any) => {
  // المفتاح محقون بواسطة Vite من متغيرات البيئة في Vercel
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API Key missing in environment. Set GEMINI_API_KEY in Vercel settings.");
    return "خطأ: لم يتم ضبط مفتاح API في إعدادات المشروع (Vercel).";
  }

  const ai = new GoogleGenAI({ apiKey });
  
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
    
    المطلوب: قدم وصفاً موجزاً (3-4 جمل) باللغة العربية لطبيعة هذه المنطقة (هل هي تجارية، سكنية، صناعية، سياحية؟) وما هي أبرز معالمها بناءً على البيانات الجغرافية المتوفرة.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي. يرجى التأكد من صلاحية مفتاح API.";
  }
};
