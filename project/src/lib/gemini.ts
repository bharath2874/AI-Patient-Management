const GEMINI_API_KEY = 'AIzaSyAlmUrkBe9H22t9eM_1Vh-xW52KSsICxeE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const FALLBACK_RESPONSE = `I'm currently unable to reach the AI service. I can still help with general guidance, clarifying questions, or walk through patient data you provide. Could you please rephrase or add more details about your request?`;

function synthesizePatientSummary(context: any, _message: string): string {
  try {
    const patient = context?.patient;
    const medical = context?.medical_summary;
    const surgeries = context?.surgeries || [];
    const recovery = context?.recovery_status;
    const milestones = context?.milestones;

    const parts: string[] = [];

    if (patient) {
      parts.push(`Patient: ${patient.name || 'Unknown'}`);
      if (patient.age) parts.push(`Age: ${patient.age}`);
      if (patient.gender) parts.push(`Gender: ${patient.gender}`);
      if (patient.blood_type) parts.push(`Blood type: ${patient.blood_type}`);
      if (patient.department) parts.push(`Department: ${patient.department}`);
      if (patient.status) parts.push(`Status: ${patient.status}`);
      if (patient.admission_date) parts.push(`Admission date: ${new Date(patient.admission_date).toLocaleDateString()}`);
    }

    if (medical) {
      parts.push(`Latest diagnosis: ${medical.latest_diagnosis || 'None recorded'}`);
      parts.push(`Current medications: ${medical.current_medications || 'None recorded'}`);
      parts.push(`Allergies: ${medical.allergies || 'None recorded'}`);
    }

    if (surgeries && surgeries.length > 0) {
      const ops = surgeries.slice(0, 5).map((s: any) => `${s.type}${s.date ? ` on ${new Date(s.date).toLocaleDateString()}` : ''}`);
      parts.push(`Surgeries: ${ops.join(', ')}`);
    }

    if (recovery) {
      if (typeof recovery.days_post_operation !== 'undefined') parts.push(`Days post-operation: ${recovery.days_post_operation}`);
      if (recovery.latest_vital_signs && Object.keys(recovery.latest_vital_signs).length > 0) {
        const vitals = recovery.latest_vital_signs;
        const vsParts = [];
        if (vitals.blood_pressure) vsParts.push(`BP: ${vitals.blood_pressure}`);
        if (vitals.heart_rate) vsParts.push(`HR: ${vitals.heart_rate}`);
        if (typeof vitals.temperature !== 'undefined') vsParts.push(`Temp: ${vitals.temperature}°C`);
        if (typeof vitals.oxygen_saturation !== 'undefined') vsParts.push(`SpO2: ${vitals.oxygen_saturation}%`);
        if (vsParts.length > 0) parts.push(`Latest vitals: ${vsParts.join(', ')}`);
      }
      if (recovery.latest_pain_level) parts.push(`Pain level: ${recovery.latest_pain_level}`);
      if (recovery.mobility_status) parts.push(`Mobility: ${recovery.mobility_status}`);
      if (recovery.wound_condition) parts.push(`Wound: ${recovery.wound_condition}`);
      if (recovery.complications) parts.push(`Complications: ${recovery.complications}`);
    }

    if (milestones) {
      const progress = typeof milestones.progress_percentage !== 'undefined' ? `${milestones.progress_percentage}%` : `${milestones.achieved || 0}/${milestones.total || 0}`;
      parts.push(`Milestones progress: ${progress}`);
      if (milestones.recent_milestones && milestones.recent_milestones.length > 0) {
        const recent = milestones.recent_milestones.slice(0, 3).map((m: any) => `${m.type}${m.achieved ? ' (achieved)' : ''}`);
        parts.push(`Recent milestones: ${recent.join(', ')}`);
      }
    }

    parts.push(`If you want more specific data (vitals, medications, surgery notes), please ask for it directly.`);

    return parts.join('\n');
  } catch (e) {
    console.error('Error synthesizing patient summary:', e);
    return FALLBACK_RESPONSE;
  }
}

export async function sendMessageToGemini(message: string, context?: any): Promise<string> {
  try {
    const prompt = context
      ? `Context: ${JSON.stringify(context, null, 2)}\n\nQuestion: ${message}\n\nProvide a helpful medical response based on the context provided.`
      : message;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      console.error('Gemini API returned non-OK status:', response.status, response.statusText);
      // If we have patient context, synthesize a contextual summary instead of the generic fallback
      if (context) return synthesizePatientSummary(context, message);
      return FALLBACK_RESPONSE;
    }

    const data = await response.json();

    if (data?.candidates && data.candidates.length > 0) {
      const text = data.candidates[0]?.content?.parts?.[0]?.text;
      if (text && text.trim().length > 0) return text;
    }

    console.warn('Gemini API returned empty content.');
    if (context) return synthesizePatientSummary(context, message);
    return FALLBACK_RESPONSE;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Fail gracefully: if we have patient context, synthesize a helpful contextual response
    if (context) return synthesizePatientSummary(context, message);
    return FALLBACK_RESPONSE;
  }
}
