import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Category, AIAnalysis } from '../types.ts';

// --- IMPORTANT ---
// PASTE YOUR GEMINI API KEY HERE.
// WARNING: This is NOT secure for a public website if your repository is public.
// Your key will be visible to anyone who views the source code.
// It is strongly recommended to keep your repository PRIVATE.
const API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
  console.warn("Gemini API key has not been set. AI features will be disabled. Please add your key in services/geminiService.ts.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        healthScore: {
            type: Type.INTEGER,
            description: "A financial health score from 0 to 100, where 100 is excellent. Based on savings rate, spending habits, and income vs expense ratio.",
        },
        savingsRate: {
            type: Type.NUMBER,
            description: "The savings rate as a decimal (e.g., 0.15 for 15%). Calculated as (total income - total expenses) / total income. Can be negative.",
        },
        spendingPrediction: {
            type: Type.INTEGER,
            description: "A prediction for the total spending for the next 30 days based on the provided history.",
        },
        insights: {
            type: Type.ARRAY,
            description: "An array of 3-5 actionable insights based on the financial data.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: {
                        type: Type.STRING,
                        description: "The type of insight: 'positive', 'info', or 'warning'.",
                    },
                    message: {
                        type: Type.STRING,
                        description: "The insight message for the user.",
                    },
                    icon: {
                        type: Type.STRING,
                        description: "A relevant Bootstrap Icons class name (e.g., 'bi-piggy-bank').",
                    },
                },
            },
        },
    },
};


export const generateAIAnalysis = async (transactions: Transaction[], currency: string): Promise<AIAnalysis> => {
  if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error("Gemini API key is not configured.");
  }

  if (transactions.length < 5) {
      throw new Error("Insufficient data for analysis. Please add at least 5 transactions.");
  }
  
  const recentTransactions = transactions.slice(-100); // Use last 100 transactions for context

  const prompt = `
    Analyze the following financial transactions (in ${currency}) and provide a detailed analysis.
    The current date is ${new Date().toISOString().split('T')[0]}.

    Transactions:
    ${JSON.stringify(recentTransactions.map(t => ({ date: t.date, type: t.type, category: t.category, amount: t.amount, description: t.description })))}

    Based on this data, provide a JSON response with the following structure:
    - A financial health score (0-100).
    - The savings rate for the period covered by the transactions.
    - A spending prediction for the next month.
    - 3 to 5 actionable insights with a type ('positive', 'info', 'warning'), a message, and a relevant Bootstrap Icon class name.
    
    Keep insights concise and impactful. The health score should reflect a holistic view of income, expenses, and savings.
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
        },
    });

    const jsonString = response.text;
    const analysisResult = JSON.parse(jsonString) as AIAnalysis;
    
    // Basic validation
    if (!analysisResult.healthScore || !analysisResult.insights) {
        throw new Error("Invalid response format from AI.");
    }

    return analysisResult;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate AI analysis. Please check your API key and network connection.");
  }
};

export const suggestCategory = async (description: string, categories: Category[]): Promise<string> => {
  if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error("Gemini API key is not configured.");
  }
  if (categories.length === 0) {
    throw new Error("No categories available to suggest from.");
  }

  const categoryNames = categories.map(c => c.name).join(', ');

  const prompt = `
    Based on the transaction description "${description}", select the most appropriate category from the following list:
    [${categoryNames}]

    Respond with ONLY the category name. For example, if the best category is "Food", your entire response must be "Food".
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    const suggestedCategory = response.text.trim();
    
    // Check if the model returned one of the provided categories
    if (categories.some(c => c.name === suggestedCategory)) {
        return suggestedCategory;
    } else {
        console.warn(`Gemini returned a category not in the list: "${suggestedCategory}". This may be a new category suggestion or a model hallucination. Falling back to the first available category as a default.`);
        return categories[0].name;
    }

  } catch (error) {
    console.error("Error calling Gemini API for category suggestion:", error);
    throw new Error("Failed to get AI category suggestion.");
  }
};
