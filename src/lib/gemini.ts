import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface InventoryInsight {
  itemId: number;
  itemName: string;
  predictionDays: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendation: string;
}

export interface ProductRecognitionResult {
  name: string;
  nameAr: string;
  categoryId?: number;
  categoryName?: string;
  estimatedPrice?: number;
  estimatedCostPrice?: number;
  description?: string;
  barcode?: string;
}

/**
 * Smart Sales Analysis: Predict stock depletion.
 * We pass basic item data and recent sales volume.
 */
export async function getInventoryInsights(items: any[], sales: any[]): Promise<InventoryInsight[]> {
  const prompt = `Analyze this inventory and sales data for an auto parts store. 
  Items: ${JSON.stringify(items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, min: i.minQuantity })))}
  Recent Sales (last 30 days): ${JSON.stringify(sales.map(s => ({ date: s.date, items: s.items.map((si: any) => ({ itemId: si.itemId, qty: si.quantity })) })))}
  
  Predict when items will run out and identify stock-out risks. 
  Return a JSON array of insights with: itemId, itemName, predictionDays (number), riskLevel ('Low', 'Medium', 'High', 'Critical'), and recommendation.
  Only include items with Medium risk or higher.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              itemId: { type: Type.NUMBER },
              itemName: { type: Type.STRING },
              predictionDays: { type: Type.NUMBER },
              riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
              recommendation: { type: Type.STRING },
            },
            required: ['itemId', 'itemName', 'predictionDays', 'riskLevel', 'recommendation']
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("AI Inventory Analysis Error:", error);
    return [];
  }
}

/**
 * Report Assistant: Answer natural language questions about reports.
 */
export async function getAIReportAssistantResponse(query: string, summaryData: any): Promise<string> {
  const prompt = `You are an expert business analyst assistant for "SmartFlow POS".
  The user is asking: "${query}"
  
  Context:
  Overall Stats: ${JSON.stringify(summaryData.stats)}
  Categories Performance: ${JSON.stringify(summaryData.categories)}
  Sales Trend: ${JSON.stringify(summaryData.trend)}

  Provide a professional, concise answer in ${summaryData.lang === 'ar' ? 'Arabic' : 'English'}. 
  If you don't have enough data, be honest.
  Use bullet points if needed.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "AI was unable to generate a response.";
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "Error communicating with AI assistant.";
  }
}

/**
 * Product Recognition: Identify product from image.
 */
export async function identifyProduct(imageBase64: string, categories: any[]): Promise<ProductRecognitionResult | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `Identify this product and categorize it. 
          Available Categories: ${categories.map(c => c.name).join(', ')}
          
          Return a JSON object with: 
          - name (English)
          - nameAr (Arabic)
          - categoryName (Matching one or most similar from list)
          - estimatedPrice (Number)
          - estimatedCostPrice (Number)
          - description (Short summary)
          `
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            nameAr: { type: Type.STRING },
            categoryName: { type: Type.STRING },
            estimatedPrice: { type: Type.NUMBER },
            estimatedCostPrice: { type: Type.NUMBER },
            description: { type: Type.STRING },
            barcode: { type: Type.STRING },
          }
        }
      }
    });

    return JSON.parse(response.text || 'null');
  } catch (error) {
    console.error("AI Product Recognition Error:", error);
    return null;
  }
}
