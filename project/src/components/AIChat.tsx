import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { sendMessageToGemini } from '../lib/gemini';
import { useAuth } from '../contexts/AuthContext';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';

type Props = {
  onClose: () => void;
  selectedPatientId: string | null;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function AIChat({ onClose, selectedPatientId }: Props) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI medical assistant. I can help you with patient information, post-operative notes, recovery progress, and answer questions about treatments and conditions. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function getPatientContext() {
    if (!selectedPatientId) return null;

    try {
      const [patientRes, recordsRes, surgeriesRes, notesRes, milestonesRes] = await Promise.all([
        supabase.from('patients').select('*').eq('id', selectedPatientId).single(),
        supabase.from('medical_records').select('*').eq('patient_id', selectedPatientId),
        supabase.from('surgeries').select('*').eq('patient_id', selectedPatientId),
        supabase.from('post_operative_notes').select('*').eq('patient_id', selectedPatientId).order('day_number', { ascending: false }),
        supabase.from('recovery_milestones').select('*').eq('patient_id', selectedPatientId)
      ]);

      if (patientRes.error) throw patientRes.error;


      const patient = patientRes.data;
      const medicalRecords = recordsRes.data || [];
      const surgeries = surgeriesRes.data || [];
      const postOpNotes = notesRes.data || [];
      const milestones = milestonesRes.data || [];

      const recoveryDays = postOpNotes.length > 0 ? postOpNotes[0].day_number : 0;

      const achievedMilestones = milestones.filter(m => m.achieved).length;
      const totalMilestones = milestones.length;

      return {
        patient: {
          name: patient.full_name,
          age: new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear(),
          gender: patient.gender,
          blood_type: patient.blood_type,
          department: patient.department,
          status: patient.status,
          admission_date: patient.admission_date
        },
        medical_summary: {
          total_records: medicalRecords.length,
          latest_diagnosis: medicalRecords[0]?.diagnosis || 'None',
          current_medications: medicalRecords[0]?.medications || 'None',
          allergies: medicalRecords[0]?.allergies || 'None'
        },
        surgeries: surgeries.map(s => ({
          type: s.surgery_type,
          date: s.surgery_date,
          surgeon: s.surgeon_name,
          duration: s.duration_minutes
        })),
        recovery_status: {
          days_post_operation: recoveryDays,
          total_post_op_notes: postOpNotes.length,
          latest_vital_signs: postOpNotes[0]?.vital_signs || {},
          latest_pain_level: postOpNotes[0]?.pain_level || 'Not recorded',
          mobility_status: postOpNotes[0]?.mobility_status || 'Not recorded',
          wound_condition: postOpNotes[0]?.wound_condition || 'Not recorded',
          complications: postOpNotes[0]?.complications || 'None'
        },
        milestones: {
          total: totalMilestones,
          achieved: achievedMilestones,
          progress_percentage: totalMilestones > 0 ? Math.round((achievedMilestones / totalMilestones) * 100) : 0,
          recent_milestones: milestones.slice(0, 5).map(m => ({
            type: m.milestone_type,
            description: m.milestone_description,
            achieved: m.achieved,
            target_date: m.target_date
          }))
        }
      };
    } catch (error) {
      console.error('Error getting patient context:', error);
      return null;
    }
  }

  // Fetch sensitive patient fields (PII) separately and only use locally
  async function getPatientPII(patientId: string) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('full_name, address, phone, email, emergency_contact_name, emergency_contact_phone')
        .eq('id', patientId)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error fetching patient PII:', e);
      return null;
    }
  }

  // Local disease reference map: brief summaries + teaching notes for interns
  const surgeryInfo: Record<string, { procedure: string; process: string; learning: string; purpose?: string; risks?: string; precautions?: string; recovery?: string }> = {
    'coronary artery bypass': {
      purpose: 'Restore blood flow to ischemic myocardium by bypassing occluded coronary arteries.',
      procedure: 'Coronary Artery Bypass Grafting (CABG) involves creating new paths for blood flow using vessel grafts to bypass blocked coronary arteries.',
      process: '1. Sternotomy and harvesting of graft vessels (typically saphenous vein or internal mammary artery)\n2. Establishing cardiopulmonary bypass (if on-pump) or off-pump techniques\n3. Identification of target coronary vessels and distal anastomoses\n4. Construction of proximal and distal graft anastomoses\n5. Weaning from bypass and hemostasis\n6. Chest closure and postoperative transfer to ICU',
      risks: 'Bleeding, graft occlusion, myocardial infarction, stroke, infection, arrhythmias, renal dysfunction.',
      precautions: 'Optimize hemodynamics, manage anticoagulation carefully, monitor electrolytes and urine output, ensure aseptic technique, and perioperative glycemic control.',
      recovery: 'ICU 24–72 hours, inpatient stay ~5–10 days depending on recovery; early mobilization, physiotherapy, cardiac rehab referral; full recovery weeks to months.',
      learning: '• Anatomy of coronary circulation\n• Graft selection and indications\n• CPB physiology and management\n• Post-op monitoring and complication recognition\n• Importance of secondary prevention (statins, antiplatelets)'
    },
    'mastectomy': {
      purpose: 'Remove malignant breast tissue and regional nodes to achieve local control of breast cancer.',
      procedure: 'Surgical removal of breast tissue, which can be partial (lumpectomy) or complete (mastectomy), often combined with sentinel lymph node biopsy.',
      process: '1. Pre-op marking and imaging review\n2. Sentinel node identification and biopsy\n3. Oncological resection with adequate margins\n4. Hemostasis and specimen handling\n5. Consider immediate or delayed reconstruction\n6. Wound closure and drain placement',
      risks: 'Bleeding, seroma, infection, lymphedema, sensory changes, need for re-excision.',
      precautions: 'Pre-op imaging, anticoagulation review, counselling about reconstruction options, and perioperative antibiotics as indicated.',
      recovery: 'Outpatient or short inpatient stay; drain management for 1–2 weeks; physiotherapy for shoulder mobility; follow-up for pathology and adjuvant planning.',
      learning: '• Breast anatomy and lymphatic drainage\n• Principles of oncologic margins\n• Sentinel node technique\n• Post-op care and psychosocial support'
    },
    'appendectomy': {
      purpose: 'Remove inflamed or perforated appendix to prevent or treat peritonitis and sepsis.',
      procedure: 'Removal of the appendix, performed laparoscopically or via open appendectomy depending on presentation.',
      process: '1. Port placement/incision\n2. Exploration and identification of appendix\n3. Mesenteric dissection and securing appendiceal base\n4. Division and removal of appendix\n5. Peritoneal toilet if perforated\n6. Closure and dressing',
      risks: 'Wound infection, intra-abdominal abscess, bowel injury, bleeding.',
      precautions: 'Appropriate imaging for diagnosis, perioperative antibiotics, careful tissue handling, and early recognition of perforation.',
      recovery: 'Often discharge within 24–48 hours for uncomplicated laparoscopic cases; longer if perforated; wound care and activity restrictions for 1–2 weeks.',
      learning: '• Laparoscopic skills and port placement\n• Recognizing complicated appendicitis\n• Principles of peritoneal contamination management\n• Post-op analgesia and mobilization'
    },
    'colectomy': {
      purpose: 'Resect diseased segments of colon for cancer, obstruction, or inflammatory disease.',
      procedure: 'Surgical removal of part or all of the colon with primary anastomosis or stoma creation as indicated.',
      process: '1. Bowel preparation and positioning\n2. Vascular control and mobilization\n3. Resection of diseased segment\n4. Anastomosis or creation of stoma\n5. Check perfusion and hemostasis\n6. Closure and drain/stoma care as needed',
      risks: 'Anastomotic leak, bleeding, infection, ileus, stoma complications.',
      precautions: 'Patient optimization, prophylactic antibiotics, DVT prophylaxis, careful anastomotic technique, and perfusion assessment.',
      recovery: 'Enhanced recovery protocols: early feeding, mobilization; hospital stay typically 3–7 days; stoma education if applicable.',
      learning: '• Colorectal anatomy and oncologic principles\n• Anastomosis technique and leak recognition\n• Stoma creation and care\n• ERAS principles'
    },
    'thyroidectomy': {
      purpose: 'Remove part or all of the thyroid for benign or malignant disease while preserving laryngeal nerves and parathyroids.',
      procedure: 'Excision of part or whole thyroid, often with lymph node assessment when indicated.',
      process: '1. Neck positioning and incision\n2. Strap muscle retraction\n3. Identification and preservation of recurrent laryngeal nerves and parathyroids\n4. Vessel ligation and gland removal\n5. Hemostasis and closure',
      risks: 'Hypocalcemia from parathyroid injury, recurrent laryngeal nerve palsy, bleeding, hematoma, infection.',
      precautions: 'Intraoperative nerve monitoring if available, careful identification of parathyroids, readiness to manage hematoma, and calcium monitoring post-op.',
      recovery: 'Short inpatient stay; monitor calcium levels; voice and calcium-related symptoms follow-up; wound care.',
      learning: '• Neck anatomy and nerve preservation\n• Post-op calcium management\n• Recognition of airway compromise\n• Importance of careful dissection'
    }
  };

  const diseaseInfo: Record<string, { summary: string; notes: string }> = {
    // Cardiology conditions
    'bypass surgery': {
      summary: 'Coronary artery bypass grafting (CABG), commonly called bypass surgery, is a procedure to restore blood flow to the heart by grafting vessels to bypass blocked coronary arteries.',
      notes: 'Indications: significant coronary artery disease with ischemia. Key perioperative points: monitor hemodynamics, watch for arrhythmias, manage bleeding, early mobilization. Common complications: wound infection, graft occlusion, myocardial infarction, stroke.'
    },
    'coronary artery bypass grafting': {
      summary: 'Coronary artery bypass grafting (CABG) replaces or bypasses damaged coronary arteries using grafts from other vessels to improve myocardial perfusion.',
      notes: 'Teaching: Understand indications vs PCI, recognize postop complications (tamponade, graft failure), and importance of secondary prevention (antiplatelets, statins, BP control).'
    },
    'myocardial infarction': {
      summary: 'Myocardial infarction (heart attack) occurs when blood flow to part of the heart is blocked, causing ischemia and necrosis.',
      notes: 'Recognize chest pain, ECG changes, elevated troponin. Acute management: MONA-B (Morphine, Oxygen if hypoxic, Nitroglycerin, Aspirin, Beta-blocker as indicated), reperfusion strategies (PCI/CABG), and long-term secondary prevention.'
    },
    'heart failure': {
      summary: 'Heart failure is a complex clinical syndrome where the heart cannot pump enough blood to meet the body\'s needs, characterized by reduced ejection fraction (HFrEF) or preserved ejection fraction (HFpEF).',
      notes: 'Key learning points: 1) Classify based on EF and NYHA. 2) Core medications: Beta-blockers, ACEi/ARB, MRA, SGLT2i for HFrEF. 3) Monitor volume status, renal function, and electrolytes. 4) Recognize acute decompensation signs. 5) Lifestyle modifications crucial.'
    },
    'atrial fibrillation': {
      summary: 'Atrial fibrillation (AF) is the most common sustained cardiac arrhythmia, characterized by irregular atrial electrical activity leading to inefficient atrial contraction.',
      notes: 'Management approach: 1) Rate vs rhythm control strategy. 2) Stroke prevention with anticoagulation based on CHA2DS2-VASc score. 3) Identify and treat underlying causes. 4) Monitor for complications and medication side effects.'
    },
    'valvular heart disease': {
      summary: 'Disorders affecting heart valves (mitral, aortic, tricuspid, pulmonary) that can lead to stenosis or regurgitation, impacting cardiac function.',
      notes: 'Clinical pearls: 1) Recognize characteristic murmurs. 2) Regular echocardiographic monitoring. 3) Timing of intervention based on symptoms and cardiac function. 4) Anticoagulation in mechanical valves. 5) Endocarditis prophylaxis in select cases.'
    },
    'coronary artery disease': {
      summary: 'Progressive atherosclerotic disease of coronary arteries leading to reduced myocardial blood flow, causing angina, infarction, or heart failure.',
      notes: 'Essential teaching: 1) Risk factor modification. 2) Medical therapy (antiplatelets, statins, beta-blockers). 3) Revascularization indications (PCI vs CABG). 4) Stress testing modalities. 5) Acute coronary syndrome recognition and management.'
    },
    'cardiomyopathy': {
      summary: 'Disease of the heart muscle affecting its size, shape, or function. Types include dilated, hypertrophic, and restrictive cardiomyopathy.',
      notes: 'Focus areas: 1) Genetic vs acquired causes. 2) Specific therapy based on type. 3) Risk stratification for sudden cardiac death. 4) Family screening in genetic cases. 5) Advanced heart failure management when indicated.'
    },
    'pericarditis': {
      summary: 'Inflammation of the pericardium (heart covering) causing chest pain and potential complications like tamponade.',
      notes: 'Clinical approach: 1) Recognize ECG changes (diffuse ST elevation). 2) NSAIDs and colchicine as first-line therapy. 3) Monitor for complications. 4) Identify underlying causes. 5) Recognize recurrence patterns.'
    },
    'appendicitis': {
      summary: 'Appendicitis is inflammation of the appendix often due to luminal obstruction, typically presenting with periumbilical pain migrating to the right lower quadrant.',
      notes: 'Diagnosis: clinical exam, ultrasound/CT. Management: early appendectomy; antibiotics in selected cases. Complications: perforation, abscess.'
    },
    'pneumonia': {
      summary: 'Pneumonia is infection of the lung parenchyma causing cough, fever, and infiltrates on imaging.',
      notes: 'Assess severity (CURB-65), start appropriate empiric antibiotics, monitor oxygenation, and consider sputum cultures for targeted therapy.'
    },
    'diabetes': {
      summary: 'Diabetes mellitus is a metabolic disease characterized by hyperglycemia due to defects in insulin secretion, insulin action, or both.',
      notes: 'Key teaching: differentiate type 1 vs type 2, monitor HbA1c, screen for complications (retinopathy, nephropathy, neuropathy), and manage with lifestyle, oral agents, and insulin as needed.'
    },
    'hypertension': {
      summary: 'Hypertension is persistently elevated arterial blood pressure and a major risk factor for cardiovascular disease.',
      notes: 'Lifestyle modification first-line; pharmacotherapy based on comorbidities and BP targets. Monitor renal function and electrolytes with certain medications.'
    }
  };

  // Comprehensive local DB query handler (counts, lists, searches, patient-specific data)
  async function handleLocalQuery(message: string): Promise<string | null> {
    const m = message.toLowerCase().trim();

    // PII requests (address, phone, email, contact) should be handled locally
    if (/\b(address|phone|email|contact|contact details|contact info)\b/i.test(m)) {
      // require authenticated user
      if (!user) {
        return 'I cannot provide personal contact details unless you are signed in with appropriate access.';
      }

      // If a specific patient is selected, return their PII (if available)
      if (selectedPatientId) {
        const pii = await getPatientPII(selectedPatientId);
        if (!pii) return 'No contact information available for the selected patient.';
        const parts: string[] = [];
        if (/address/i.test(m) && pii.address) parts.push(`Address: ${pii.address}`);
        if (/phone|contact/i.test(m) && pii.phone) parts.push(`Phone: ${pii.phone}`);
        if (/email/i.test(m) && pii.email) parts.push(`Email: ${pii.email}`);
        if (parts.length === 0) return 'No matching contact fields found for this patient.';
        return parts.join('\n');
      }

      // If no patient selected, try to extract a patient name from the query
      const nameMatch = m.match(/(?:patient|find|show)\s+([a-z\s]+?)\s+(?:address|phone|email|contact)/i);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        try {
          const { data, error } = await supabase
            .from('patients')
            .select('id, full_name, address, phone, email')
            .ilike('full_name', `%${name}%`)
            .limit(10);
          if (error) throw error;
          if (!data || data.length === 0) return `No patients found matching "${name}".`;
          // return first match
          const p = data[0];
          const parts = [];
          if (/address/i.test(m) && p.address) parts.push(`Address: ${p.address}`);
          if (/phone|contact/i.test(m) && p.phone) parts.push(`Phone: ${p.phone}`);
          if (/email/i.test(m) && p.email) parts.push(`Email: ${p.email}`);
          if (parts.length === 0) return `No contact details found for ${p.full_name}.`;
          return `Contact details for ${p.full_name}:\n${parts.join('\n')}`;
        } catch (e) {
          console.error('Error searching for patient PII:', e);
          return null;
        }
      }

      // No name and no selection: deny to avoid leaking PII
      return 'Please select a patient or include a patient name when requesting contact details.';
    }

    // Disease info lookup: detect common disease names and return summary + notes
    try {
      for (const key of Object.keys(diseaseInfo)) {
        if (m.includes(key)) {
          const info = diseaseInfo[key];
          return `About ${key}:\n${info.summary}\n\nNotes for learners:\n${info.notes}`;
        }
      }
    } catch (e) {
      console.error('Error in disease lookup:', e);
    }

    // 1) Total patient count (and list) across all departments
    if (/^how many patients$|how many patients in total|number of patients|count of patients/i.test(m)) {
      try {
        const { data, error } = await supabase.from('patients').select('id, full_name');
        if (error) throw error;
        if (!data || data.length === 0) return 'No patients found.';
        const names = data.map((p: any) => p.full_name).join('\n• ');
        return `Total patients: ${data.length}\n\n• ${names}`;
      } catch (e) {
        console.error('Error fetching department counts:', e);
        return null;
      }
    }

    // Full patient details by name: supports 'I want patient Aarav details', 'show patient Aarav details', etc.
    const detailsNameMatch = message.match(/(?:i want patient|show patient|show details of|details of|details)\s+([a-z ]+)/i);
    if (detailsNameMatch) {
      const name = detailsNameMatch[1].replace(/details|info|information|record|records|all|full|about|of|for/g, '').trim();
      if (!name) return null;
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .ilike('full_name', `%${name}%`)
          .limit(1);
        if (error) throw error;
        if (!data || data.length === 0) return `No record found for ${name}.`;
        const p = data[0];
        // Fetch related records
        const [{ data: recs }, { data: surgs }, { data: notes }, { data: milestones }] = await Promise.all([
          supabase.from('medical_records').select('*').eq('patient_id', p.id).order('created_at', { ascending: false }),
          supabase.from('surgeries').select('*').eq('patient_id', p.id).order('surgery_date', { ascending: false }),
          supabase.from('post_operative_notes').select('*').eq('patient_id', p.id).order('day_number', { ascending: false }).limit(5),
          supabase.from('recovery_milestones').select('*').eq('patient_id', p.id)
        ]);

        const dob = p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : 'Unknown';
        const age = p.date_of_birth ? (new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()) : 'Unknown';

        const rec = (recs && recs.length > 0) ? recs[0] : null;

        const out: string[] = [];
        out.push(`Full record for ${p.full_name}:`);
        out.push(`- Age: ${age}`);
        out.push(`- DOB: ${dob}`);
        out.push(`- Gender: ${p.gender || 'Not specified'}`);
        out.push(`- Blood type: ${p.blood_type || 'Not specified'}`);
        out.push(`- Department: ${p.department || 'Not specified'}`);
        out.push(`- Status: ${p.status || 'Not specified'}`);
        out.push(`- Contact: ${p.phone || 'Not provided'} | ${p.email || 'No email'}`);
        out.push(`- Address: ${p.address || 'Not provided'}`);
        out.push('');
        if (rec) {
          out.push('Diagnosis & Treatment:');
          out.push(`• Diagnosis: ${rec.diagnosis || 'Not recorded'}`);
          out.push(`• Medications: ${rec.medications || 'Not recorded'}`);
          out.push(`• Allergies: ${rec.allergies || 'Not recorded'}`);
          out.push(`• Treatment Plan: ${rec.treatment_plan || 'Not recorded'}`);
          out.push('');
        }
        if (surgs && surgs.length > 0) {
          out.push('Surgeries:');
          for (const s of surgs) {
            out.push(`• ${s.surgery_type} — ${s.surgery_date ? new Date(s.surgery_date).toLocaleString() : 'date/time unknown'} by ${s.surgeon_name || 'Unknown'}`);
            if (s.notes) out.push(`  Notes: ${s.notes}`);
          }
          out.push('');
        }
        if (notes && notes.length > 0) {
          out.push('Recent Post-Op Notes:');
          for (const n of notes.slice(0, 5)) {
            out.push(`• Day ${n.day_number || '?'} — Pain: ${n.pain_level || 'N/A'} | Wound: ${n.wound_condition || 'N/A'}${n.complications ? ` | Complications: ${n.complications}` : ''}`);
          }
          out.push('');
        }
        if (milestones && milestones.length > 0) {
          const achieved = milestones.filter((m: any) => m.achieved).length;
          out.push(`Recovery milestones: ${achieved}/${milestones.length} achieved`);
        }

        return out.join('\n');
      } catch (e) {
        console.error('Error fetching full patient details:', e);
        return 'An error occurred while fetching patient details. Please try again.';
      }
    }

    // Name-scoped action queries: "Priya surgery", "patient Priya post-op", "Priya recovery progress", "Priya meds"
    const nameActionMatch = message.match(/^(?:patient\s+)?([a-z\s]+?)\s+(surgery|surgeries|post-?op|post op|postoperative|post operative|recovery|progress|details|age|how old|meds|medications|vitals|vital signs|contact|phone|email|address)$/i);
    if (nameActionMatch) {
      const name = nameActionMatch[1].trim();
      const action = nameActionMatch[2].toLowerCase();
      try {
        const { data: patients, error: pErr } = await supabase
          .from('patients')
          .select('*')
          .ilike('full_name', `%${name}%`)
          .limit(10);
        if (pErr) throw pErr;
        if (!patients || patients.length === 0) return `No patients found matching "${name}".`;

        if (patients.length > 1) {
          // return short disambiguation list
          const rows = patients.map((p: any) => {
            const age = p.date_of_birth ? (new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()) : 'Unknown';
            return `• ${p.full_name} — ${p.department || 'Unknown dept'} — Age: ${age}`;
          }).join('\n');
          return `Multiple patients found matching "${name}":\n${rows}\n\nPlease repeat with the full name or select the patient in the UI for detailed info.`;
        }

        const patient = patients[0];
        const pid = patient.id;

        // Age / contact / blood type
        if (/age|how old/i.test(action)) {
          const age = patient.date_of_birth ? (new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()) : 'Unknown';
          return `${patient.full_name} — Age: ${age} (DOB: ${patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'Unknown'})`;
        }
        if (/blood|blood type|blood group/i.test(action)) {
          return `${patient.full_name} — Blood type: ${patient.blood_type || 'Not recorded'}`;
        }
        if (/contact|phone|email|address/i.test(action)) {
          return `Contact for ${patient.full_name}:\nPhone: ${patient.phone || 'Not recorded'}\nEmail: ${patient.email || 'Not recorded'}\nAddress: ${patient.address || 'Not recorded'}\nEmergency contact: ${patient.emergency_contact_name || 'Not recorded'} — ${patient.emergency_contact_phone || 'Not recorded'}`;
        }

        // Fetch medical records / surgeries / post-op / milestones as needed
        if (/surgery|surgeries/i.test(action)) {
          const { data: surgs, error: sErr } = await supabase.from('surgeries').select('*').eq('patient_id', pid).order('surgery_date', { ascending: false });
          if (sErr) throw sErr;
          if (!surgs || surgs.length === 0) return `No surgeries found for ${patient.full_name}.`;
          let resp = `Surgeries for ${patient.full_name}:\n`;
          for (const s of surgs) {
            resp += `\n• ${s.surgery_type} — ${s.surgery_date ? new Date(s.surgery_date).toLocaleString() : 'date/time unknown'}\n  Surgeon: ${s.surgeon_name || 'Unknown'}\n  Duration: ${s.duration_minutes ? `${s.duration_minutes} minutes` : 'Not recorded'}\n`;
            // educational content if available
            const key = Object.keys(surgeryInfo).find(k => s.surgery_type.toLowerCase().includes(k) || k.includes(s.surgery_type.toLowerCase()));
            if (key) {
              const info = surgeryInfo[key];
              resp += `  Procedure: ${info.procedure}\n  Purpose: ${info.purpose || 'N/A'}\n  Learning: ${info.learning}\n`;
            }
            // latest post-op note for that surgery
            try {
              const { data: post } = await supabase.from('post_operative_notes').select('*').eq('patient_id', pid).eq('surgery_id', s.id).order('day_number', { ascending: false }).limit(1);
              if (post && post.length > 0) {
                const n = post[0];
                resp += `  Latest post-op: Pain ${n.pain_level || 'N/A'} | Wound: ${n.wound_condition || 'N/A'}${n.complications ? ` | Complications: ${n.complications}` : ''}\n`;
              }
            } catch (e) {
              console.error('Error fetching post-op for surgery:', e);
            }
            resp += '\n';
          }
          return resp;
        }

        if (/post-?op|post op|postoperative|post operative/i.test(action)) {
          const { data: notes, error: nErr } = await supabase.from('post_operative_notes').select('*').eq('patient_id', pid).order('day_number', { ascending: false }).limit(10);
          if (nErr) throw nErr;
          if (!notes || notes.length === 0) return `No post-operative notes found for ${patient.full_name}.`;
          const lines = notes.map((note: any) => `• Day ${note.day_number || '?'} — Vitals: ${JSON.stringify(note.vital_signs || {})} | Pain: ${note.pain_level || 'N/A'} | Wound: ${note.wound_condition || 'N/A'}${note.complications ? ` | Complications: ${note.complications}` : ''}`);
          return `Post-operative notes for ${patient.full_name} (most recent first):\n${lines.join('\n')}`;
        }

        if (/recovery|progress/i.test(action)) {
          const { data: ms, error: mErr } = await supabase.from('recovery_milestones').select('*').eq('patient_id', pid).order('created_at', { ascending: false });
          if (mErr) throw mErr;
          if (!ms || ms.length === 0) return `No recovery milestones found for ${patient.full_name}.`;
          const achieved = ms.filter((m: any) => m.achieved).length;
          const recent = ms.slice(0, 5).map((d: any) => `• ${d.milestone_type} — ${d.milestone_description} ${d.achieved ? '(achieved)' : ''}`);
          return `Recovery progress for ${patient.full_name}: ${achieved}/${ms.length} achieved\nRecent:\n${recent.join('\n')}`;
        }

        if (/meds|medications|drugs|prescription/i.test(action)) {
          const { data: recs, error: rErr } = await supabase.from('medical_records').select('*').eq('patient_id', pid).order('created_at', { ascending: false }).limit(5);
          if (rErr) throw rErr;
          if (!recs || recs.length === 0) return `No medical records found for ${patient.full_name}.`;
          const rec = recs[0];
          return `Latest medical record for ${patient.full_name}:\nDiagnosis: ${rec.diagnosis || 'N/A'}\nMedications: ${rec.medications || rec.current_medications || 'No medications recorded'}`;
        }

        // fallback: return brief patient info
        return `Found patient: ${patient.full_name} — Department: ${patient.department || 'N/A'} — Status: ${patient.status || 'N/A'}`;
      } catch (e) {
        console.error('Error handling name-scoped action:', e);
        return 'I encountered an error processing that request. Please try again.';
      }
    }

    // 2) Department patient details (e.g., "cardiology patient details")
    const deptMatch = m.match(/\b(cardiology|oncology|surgery)\b/);
    if (deptMatch && /patient|patients|details|list/i.test(m)) {
      const dept = deptMatch[1];
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('department', dept)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        if (!data || data.length === 0) return `No patients found in ${dept}.`;

        const list = data.map((p: any) => {
          const admitted = p.admission_date ? new Date(p.admission_date).toLocaleDateString() : 'admission date unknown';
          return `• ${p.full_name} — ${p.status || 'status unknown'}, admitted ${admitted}`;
        }).join('\n');

        return `Patients in ${dept} (showing up to 10):\n${list}`;
      } catch (e) {
        console.error('Error fetching patients for department:', e);
        return null;
      }
    }

    // Single-field queries: age, blood group, contact for selected patient
    if (selectedPatientId && /\b(age|how old|blood group|blood type|contact|phone|email|address)\b/i.test(m)) {
      try {
        const { data: p, error } = await supabase.from('patients').select('*').eq('id', selectedPatientId).single();
        if (error || !p) return 'No patient selected or patient record not found.';
        if (/age|how old/i.test(m)) return `Age: ${new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()} (DOB: ${p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : 'unknown'})`;
        if (/blood group|blood type/i.test(m)) return `Blood type: ${p.blood_type || 'Not recorded'}`;
        if (/phone|contact/i.test(m)) return `Phone: ${p.phone || 'Not recorded'}\nEmergency contact: ${p.emergency_contact_name || 'Not recorded'} — ${p.emergency_contact_phone || 'Not recorded'}`;
        if (/email/i.test(m)) return `Email: ${p.email || 'Not recorded'}`;
        if (/address/i.test(m)) return `Address: ${p.address || 'Not recorded'}`;
      } catch (e) {
        console.error('Error fetching single-field patient info:', e);
        return null;
      }
    }

    // Educational 'teach me about' handler (surgery or treatment)
    if (/^(teach me about|educate me about|what is|explain)\s+(.+)/i.test(message)) {
      const parts = message.match(/^(?:teach me about|educate me about|what is|explain)\s+(.+)/i);
      const topic = parts ? parts[1].toLowerCase().trim() : null;
      if (topic) {
        // Check surgeryInfo first
        const sKey = Object.keys(surgeryInfo).find(k => topic.includes(k) || k.includes(topic));
        if (sKey) {
          const info = surgeryInfo[sKey];
          return `About ${sKey}:\nPurpose: ${info.purpose || 'N/A'}\n\nProcedure Overview:\n${info.procedure}\n\nProcess:\n${info.process}\n\nRisks:\n${info.risks || 'N/A'}\n\nPrecautions:\n${info.precautions || 'N/A'}\n\nRecovery:\n${info.recovery || 'N/A'}\n\nLearning points for interns:\n${info.learning}`;
        }

        // Check diseaseInfo as fallback
        const dKey = Object.keys(diseaseInfo).find(k => topic.includes(k) || k.includes(topic));
        if (dKey) {
          const info = diseaseInfo[dKey];
          return `About ${dKey}:\n${info.summary}\n\nNotes for learners:\n${info.notes}`;
        }

        return 'I do not have structured information on that topic locally. I can still look up patient records or provide basic guidance based on available data.';
      }
    }
    // Quick name+age queries: "Priya age" or "patient Priya age" or "Priya how old"
    const nameAgeMatch = message.match(/^(?:patient\s+)?([a-z\s]+?)\s+(?:age|how old|what is the age|what's the age)$/i);
    if (nameAgeMatch) {
      const name = nameAgeMatch[1].trim();
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, full_name, date_of_birth')
          .ilike('full_name', `%${name}%`)
          .limit(10);
        if (error) throw error;
        if (!data || data.length === 0) return `No patients found matching "${name}".`;
        if (data.length === 1) {
          const p = data[0];
          const age = p.date_of_birth ? (new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()) : 'Unknown';
          return `${p.full_name} — Age: ${age}`;
        }
        // multiple matches: list names with ages
        const rows = data.map((p: any) => {
          const age = p.date_of_birth ? (new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()) : 'Unknown';
          return `• ${p.full_name} — Age: ${age}`;
        }).join('\n');
        return `Multiple patients found matching "${name}":\n${rows}`;
      } catch (e) {
        console.error('Error searching patient by name+age:', e);
        return 'I encountered an error while searching for that patient. Please try again.';
      }
    }

    // 3) Search patient by name: "find patient john doe" or "search patient john" or just "patient name"
    const searchMatch = m.match(/(?:find|search|show)?\s*patient\s+(.+)/i);
    if (searchMatch) {
      const name = searchMatch[1].trim();
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .ilike('full_name', `%${name}%`)
          .limit(10);
        if (error) throw error;
        if (!data || data.length === 0) return `No patients found matching "${name}".`;

        // Enhanced patient information display
        const rows = data.map((p: any) => {
          const admitted = p.admission_date ? `admitted ${new Date(p.admission_date).toLocaleDateString()}` : '';
          const diagnosis = p.latest_diagnosis || '';
          return `• ${p.full_name}
    Department: ${p.department}
    Status: ${p.status || 'Not specified'}
    ${admitted}
    ${diagnosis ? `Diagnosis: ${diagnosis}` : ''}`
        }).join('\n\n');
        return `Found ${data.length} patient(s) matching "${name}":\n${rows}`;
      } catch (e) {
        console.error('Error searching patients:', e);
        return 'I encountered an error while searching for the patient. Please try again or contact support if the issue persists.';
      }
    }

    // 4) Patient-specific queries when a patient is selected
    if (selectedPatientId) {
      // Handler for 'I want patient details' or similar
      if (/i want patient details|show all patient info|show all details|show patient info|show patient details|all info of patient|all details of patient/i.test(m)) {
        try {
          const [{ data: p }, { data: recs }, { data: surgs }, { data: notes }, { data: milestones }] = await Promise.all([
            supabase.from('patients').select('*').eq('id', selectedPatientId).single(),
            supabase.from('medical_records').select('*').eq('patient_id', selectedPatientId).order('created_at', { ascending: false }),
            supabase.from('surgeries').select('*').eq('patient_id', selectedPatientId).order('surgery_date', { ascending: false }),
            supabase.from('post_operative_notes').select('*').eq('patient_id', selectedPatientId).order('day_number', { ascending: false }).limit(5),
            supabase.from('recovery_milestones').select('*').eq('patient_id', selectedPatientId)
          ]);
          if (!p) return 'No patient selected or patient record not found.';
          const dob = p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : 'Unknown';
          const age = p.date_of_birth ? (new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()) : 'Unknown';
          const rec = (recs && recs.length > 0) ? recs[0] : null;
          const out: string[] = [];
          out.push(`Full record for ${p.full_name}:`);
          out.push(`- Age: ${age}`);
          out.push(`- DOB: ${dob}`);
          out.push(`- Gender: ${p.gender || 'Not specified'}`);
          out.push(`- Blood type: ${p.blood_type || 'Not specified'}`);
          out.push(`- Department: ${p.department || 'Not specified'}`);
          out.push(`- Status: ${p.status || 'Not specified'}`);
          out.push(`- Contact: ${p.phone || 'Not provided'} | ${p.email || 'No email'}`);
          out.push(`- Address: ${p.address || 'Not provided'}`);
          out.push('');
          if (rec) {
            out.push('Diagnosis & Treatment:');
            out.push(`• Diagnosis: ${rec.diagnosis || 'Not recorded'}`);
            out.push(`• Medications: ${rec.medications || 'Not recorded'}`);
            out.push(`• Allergies: ${rec.allergies || 'Not recorded'}`);
            out.push(`• Treatment Plan: ${rec.treatment_plan || 'Not recorded'}`);
            out.push('');
          }
          if (surgs && surgs.length > 0) {
            out.push('Surgeries:');
            for (const s of surgs) {
              out.push(`• ${s.surgery_type} — ${s.surgery_date ? new Date(s.surgery_date).toLocaleString() : 'date/time unknown'} by ${s.surgeon_name || 'Unknown'}`);
              if (s.notes) out.push(`  Notes: ${s.notes}`);
            }
            out.push('');
          }
          if (notes && notes.length > 0) {
            out.push('Recent Post-Op Notes:');
            for (const n of notes.slice(0, 5)) {
              out.push(`• Day ${n.day_number || '?'} — Pain: ${n.pain_level || 'N/A'} | Wound: ${n.wound_condition || 'N/A'}${n.complications ? ` | Complications: ${n.complications}` : ''}`);
            }
            out.push('');
          }
          if (milestones && milestones.length > 0) {
            const achieved = milestones.filter((m: any) => m.achieved).length;
            out.push(`Recovery milestones: ${achieved}/${milestones.length} achieved`);
          }
          return out.join('\n');
        } catch (e) {
          console.error('Error fetching all patient details:', e);
          return 'An error occurred while fetching patient details. Please try again.';
        }
      }
      // Check for educational queries about patient's condition
      if (/what (condition|disease|diagnosis)|tell me about (the condition|the disease|their diagnosis)|explain their (condition|disease|diagnosis)/i.test(m)) {
        try {
          const { data: records, error: recordError } = await supabase
            .from('medical_records')
            .select('*')
            .eq('patient_id', selectedPatientId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (recordError) throw recordError;
          if (!records || records.length === 0) return 'No medical records found for this patient.';

          const record = records[0];
          const diagnosis = record.diagnosis?.toLowerCase() || '';
          let educationalContent = '';

          // Match diagnosis with our disease info dictionary
          const matchingDisease = Object.entries(diseaseInfo).find(([key]) => 
            diagnosis.includes(key) || key.includes(diagnosis)
          );

          if (matchingDisease) {
            const [disease, info] = matchingDisease;
            educationalContent = `
Patient's Diagnosis: ${record.diagnosis}

About this condition:
${info.summary}

Clinical Context:
• Current Medications: ${record.medications || 'None recorded'}
• Medical History: ${record.medical_history || 'Not available'}
• Allergies: ${record.allergies || 'None recorded'}

Teaching Notes for Interns:
${info.notes}

Treatment Plan:
${record.treatment_plan || 'No specific treatment plan recorded'}

Key Learning Points:
1. Observe how the theoretical knowledge applies to this real case
2. Note any variations from typical presentation
3. Follow the treatment response and adjust care accordingly`;
          } else {
            // If we don't have specific disease info, still provide the medical record
            educationalContent = `
Patient's Diagnosis: ${record.diagnosis}

Available Clinical Information:
• Medications: ${record.medications || 'None recorded'}
• Medical History: ${record.medical_history || 'Not available'}
• Treatment Plan: ${record.treatment_plan || 'Not specified'}
• Allergies: ${record.allergies || 'None recorded'}

Note: Consider researching more about this condition in medical literature for comprehensive understanding.`;
          }

          return educationalContent;
        } catch (e) {
          console.error('Error fetching educational content:', e);
          return null;
        }
      }

      // Surgeries - Enhanced with educational content
      if (/surgery|surgeries|bypass|operation|procedure|ops?/i.test(m)) {
        try {
          const { data, error } = await supabase
            .from('surgeries')
            .select('*')
            .eq('patient_id', selectedPatientId)
            .order('surgery_date', { ascending: false });
          if (error) throw error;
          if (!data || data.length === 0) return 'No surgeries found for this patient.';
          
          let response = 'Surgery History:\n';
          
          for (const surgery of data) {
            // Format the basic surgery information
            response += `\n📅 ${surgery.surgery_type}\n`;
            response += `Date: ${surgery.surgery_date ? new Date(surgery.surgery_date).toLocaleDateString() : 'date unknown'}\n`;
            response += `Surgeon: ${surgery.surgeon_name || 'unknown'}\n`;
            response += `Duration: ${surgery.duration_minutes ? `${surgery.duration_minutes} minutes` : 'duration not recorded'}\n`;
            
            // Add educational content if available
            const surgeryKey = Object.keys(surgeryInfo).find(key => 
              surgery.surgery_type.toLowerCase().includes(key) || 
              key.includes(surgery.surgery_type.toLowerCase())
            );
            
            if (surgeryKey) {
              const info = surgeryInfo[surgeryKey];
              response += '\nProcedure Overview:\n';
              response += info.procedure + '\n';
              
              if (m.includes('process') || m.includes('how') || m.includes('detail')) {
                response += '\nSurgical Process:\n';
                response += info.process + '\n';
              }
              
              if (m.includes('learn') || m.includes('teach') || m.includes('intern')) {
                response += '\nLearning Points for Interns:\n';
                response += info.learning + '\n';
              }
            }
            
            // Add post-operative status if available
            try {
              const { data: postOpData } = await supabase
                .from('post_operative_notes')
                .select('*')
                .eq('patient_id', selectedPatientId)
                .eq('surgery_id', surgery.id)
                .order('day_number', { ascending: false })
                .limit(1);
                
              if (postOpData && postOpData.length > 0) {
                const latestNote = postOpData[0];
                response += '\nLatest Post-Op Status:\n';
                if (latestNote.complications) response += `• Complications: ${latestNote.complications}\n`;
                if (latestNote.wound_condition) response += `• Wound: ${latestNote.wound_condition}\n`;
                if (latestNote.recovery_notes) response += `• Recovery Notes: ${latestNote.recovery_notes}\n`;
              }
            } catch (e) {
              console.error('Error fetching post-op notes:', e);
            }
            
            response += '\n-------------------\n';
          }
          
          return response;
        } catch (e) {
          console.error('Error fetching surgeries:', e);
          return 'I encountered an error while fetching surgery information. Please try again or contact support.';
        }
      }

      // Vitals / post-op notes
      if (/vital|vitals|blood pressure|heart rate|temperature|oxygen|spO2|oxygen saturation|pain|mobility|wound/i.test(m)) {
        try {
          const { data, error } = await supabase
            .from('post_operative_notes')
            .select('*')
            .eq('patient_id', selectedPatientId)
            .order('day_number', { ascending: false })
            .limit(5);
          if (error) throw error;
          if (!data || data.length === 0) return 'No post-operative notes found for this patient.';
          // summarize most recent note
          const note = data[0];
          const vitals = note.vital_signs || {};
          const lines = [];
          if (vitals.blood_pressure) lines.push(`BP: ${vitals.blood_pressure}`);
          if (vitals.heart_rate) lines.push(`HR: ${vitals.heart_rate}`);
          if (typeof vitals.temperature !== 'undefined') lines.push(`Temp: ${vitals.temperature}°C`);
          if (typeof vitals.oxygen_saturation !== 'undefined') lines.push(`SpO2: ${vitals.oxygen_saturation}%`);
          if (note.pain_level) lines.push(`Pain level: ${note.pain_level}`);
          if (note.mobility_status) lines.push(`Mobility: ${note.mobility_status}`);
          if (note.wound_condition) lines.push(`Wound: ${note.wound_condition}`);
          if (note.complications) lines.push(`Complications: ${note.complications}`);
          return `Latest post-op note (day ${note.day_number}):\n${lines.join('\n')}`;
        } catch (e) {
          console.error('Error fetching post-op notes:', e);
          return null;
        }
      }

      // Medications / medical records
      if (/medicat|meds|medications|drugs|prescription/i.test(m)) {
        try {
          const { data, error } = await supabase
            .from('medical_records')
            .select('*')
            .eq('patient_id', selectedPatientId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (error) throw error;
          if (!data || data.length === 0) return 'No medical records found for this patient.';
          const rec = data[0];
          const meds = rec.medications || rec.current_medications || 'No medications recorded';
          return `Latest medical record:\nDiagnosis: ${rec.diagnosis || 'N/A'}\nMedications: ${meds}`;
        } catch (e) {
          console.error('Error fetching medical records:', e);
          return null;
        }
      }

      // Recovery milestones / progress
      if (/milestone|milestones|progress|recovery progress|recovered/i.test(m)) {
        try {
          const { data, error } = await supabase
            .from('recovery_milestones')
            .select('*')
            .eq('patient_id', selectedPatientId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (!data || data.length === 0) return 'No recovery milestones found for this patient.';
          const achieved = data.filter((d: any) => d.achieved).length;
          const total = data.length;
          const recent = data.slice(0, 5).map((d: any) => `• ${d.milestone_type} — ${d.milestone_description} ${d.achieved ? '(achieved)' : ''}`);
          return `Milestones: ${achieved}/${total} achieved\nRecent:\n${recent.join('\n')}`;
        } catch (e) {
          console.error('Error fetching milestones:', e);
          return null;
        }
      }
    }

    return null;
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    try {
      // First attempt local handling for department-level queries
      const local = await handleLocalQuery(userMessage);
      if (local) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: local,
          timestamp: new Date()
        }]);
        setLoading(false);
        return;
      }

      // Get patient context for AI response
      const context = await getPatientContext();
      
      try {
        const response = await sendMessageToGemini(userMessage, context);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }]);
      } catch (aiError) {
        console.error('AI Service Error:', aiError);
        // Fallback response when AI service fails
        let fallbackResponse = 'I\'m currently having trouble connecting to the AI service. ';
        
        if (userMessage.toLowerCase().includes('patient')) {
          fallbackResponse += 'You can still search for patients by saying "patient [name]" or get information about the current patient\'s vitals, medications, or progress.';
        } else if (context) {
          fallbackResponse += 'However, I can still help you with basic patient information like vitals, medications, surgeries, and progress. What would you like to know?';
        } else {
          fallbackResponse += 'You can still use basic features like patient search, department information, and medical reference lookups.';
        }
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: fallbackResponse,
          timestamp: new Date()
        }]);
        setLoading(false);
        return;
      }

      if (user && context) {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          patient_id: selectedPatientId,
          message: userMessage,
          response: response,
          context_data: context
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      const safeMessage = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an error processing your request: ${safeMessage}. Please check the console for details.`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full h-[80vh] flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 p-6 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Medical Assistant</h2>
              <div className="flex items-center space-x-1 text-white/90 text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Powered by Gemini AI</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {selectedPatientId && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <p className="text-sm text-blue-800 font-semibold">
              Context: Currently viewing patient data
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-3 max-w-[80%] ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600'
                    : 'bg-gradient-to-br from-purple-600 to-pink-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 px-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-4 bg-gray-50 rounded-b-2xl">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about patient progress, recovery data, or medical information..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold"
            >
              <Send className="w-5 h-5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
