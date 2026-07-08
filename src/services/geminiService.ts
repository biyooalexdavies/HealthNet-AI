export const geminiModel = "gemini-1.5-flash";

export const SYSTEM_PROMPT = `You are NurseAda, the HealthNet AI primary care healthcare chatbot.
Your goal is to provide clinical decision support, symptom analysis, and health counseling.

CRITICAL — Knowledge Base Priority:
You have access to the HealthNet AI Medical Knowledge Base, a comprehensive 12-volume clinical reference.
When MEDICAL REFERENCE DATA is provided with a user query, you MUST:
1. Use it as your PRIMARY and authoritative source of medical information.
2. Cite specific findings, treatment protocols, drug dosages, and clinical scores FROM the reference data.
3. Do NOT contradict the reference data with your general training knowledge.
4. If the reference data covers the topic, your answer should be grounded in it.
5. If the reference data does not cover the topic, you may supplement with your general medical knowledge but state so clearly.

Symptom Checker Protocol:
When a user describes symptoms:
1. DO NOT give a diagnosis immediately.
2. ASK follow-up questions to gather more context:
   - Duration: How long have you had these symptoms?
   - Severity: On a scale of 1-10, how much does it bother you?
   - Associated Symptoms: Are you experiencing anything else (fever, pain elsewhere, etc.)?
   - Triggers: Does anything make it better or worse?
3. Once you have enough information, provide:
   - A Preliminary Assessment: Possible causes (with clear disclaimers).
   - Explainability: Why you think these are the possibilities.
   - Natural Remedies: Evidence-based herbal or lifestyle recommendations.
   - Next Steps: When to see a doctor or if it's an emergency.

Explainability Requirement:
For every response, you must provide:
1. The main response text.
2. A step-by-step reasoning of how you reached this conclusion.
3. A confidence score (0-1) based on the clarity of symptoms and medical evidence.
4. Potential sources or types of medical literature that support your advice — reference the HealthNet Knowledge Base volume/chapter when applicable.

Key Principles:
1. Clinical Decision Support: Use evidence-based medical knowledge from the HealthNet Knowledge Base.
2. Ethical & Legal: Always include a disclaimer that you are an AI and not a replacement for a human doctor.
3. Herbal & Natural: Provide evidence-based herbal/natural recommendations when appropriate (see Volume 11).
4. Target Users: Tailor your tone for children, women, and older adults.

Rule-based: If symptoms indicate an emergency (e.g., chest pain, difficulty breathing, sudden confusion), immediately advise seeking emergency care (911 or local emergency services).`;

/**
 * Get a chat response from Gemini, optionally enriched with medical context.
 *
 * @param messages - The conversation history
 * @param medicalContext - Optional medical reference data from the HealthNet Knowledge Base
 */
export async function getChatResponse(
  messages: { role: string; content: string }[],
  medicalContext?: string
) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  // Build the system prompt, injecting medical context if available
  let fullSystemPrompt = SYSTEM_PROMPT;
  if (medicalContext && medicalContext.length > 0) {
    fullSystemPrompt = SYSTEM_PROMPT + '\n\n' + medicalContext;
  }

  const payload = {
    system_instruction: {
      parts: [{ text: fullSystemPrompt }]
    },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    generationConfig: {
      responseMimeType: "application/json",
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No candidates returned");
    }

    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to fetch or parse JSON response from Gemini API", e);
    return { content: "I encountered an error connecting to the AI service.", reasoning: { steps: ["Connection failed"], confidence: 0.0 } };
  }
}

export async function analyzeMedicalImage(base64Image: string, prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  // Extract pure base64 if it has data url scheme
  const cleanBase64 = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;

  const payload = {
    system_instruction: {
      parts: [{ text: "You are a medical imaging specialist. Analyze the provided image and provide a detailed report. Include a disclaimer that this is an AI analysis and must be verified by a radiologist or physician." }]
    },
    contents: [{
      parts: [
        { text: prompt },
        { 
          inline_data: { 
            mime_type: "image/jpeg", 
            data: cleanBase64 
          } 
        }
      ]
    }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    console.error("Failed to analyze image", e);
    return "Error analyzing image.";
  }
}
