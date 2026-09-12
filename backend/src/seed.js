require('dotenv').config();
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const prisma = require('./lib/prisma');

function buildPdfBuffer(summary) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('arogyavaani AI — Primary Health Condition Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Patient: ${summary.patient_info.name}`);
    doc.text(`Age / Gender: ${summary.patient_info.age ?? '-'} / ${summary.patient_info.gender ?? '-'}`);
    doc.text(`Village: ${summary.patient_info.village ?? '-'}`);
    doc.moveDown();

    doc.fontSize(14).text('Chief Complaint');
    doc.fontSize(12).text(summary.chief_complaint);
    doc.moveDown();

    doc.fontSize(14).text('Symptom Summary');
    summary.symptom_summary.forEach((s) => {
      doc.fontSize(12).text(`- ${s.symptom}: onset ${s.onset}, duration ${s.duration}, severity ${s.severity}`);
    });
    doc.moveDown();

    doc.fontSize(14).text('Red Flags');
    doc.fontSize(12).text(summary.red_flags.length ? summary.red_flags.join(', ') : 'None reported');
    doc.moveDown();

    doc.fontSize(14).text(`Urgency Level: ${summary.urgency_level.toUpperCase()}`);
    doc.moveDown();

    doc.fontSize(14).text('Possible Conditions (AI-generated hypotheses for doctor review — not a diagnosis)');
    summary.possible_conditions.forEach((c) => {
      doc.fontSize(12).text(`- ${c.condition}: ${c.rationale}`);
    });
    doc.moveDown();

    doc.fontSize(14).text('Recommended Next Steps');
    doc.fontSize(12).text(summary.recommended_next_steps);

    doc.end();
  });
}

async function upsertUser({ role, name, email, password, phone, extra }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { role, name, email, passwordHash, phone },
  });

  if (role === 'PATIENT') {
    const patient = await prisma.patient.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, ...extra },
    });
    return { user, patient };
  }
  const doctor = await prisma.doctor.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, ...extra },
  });
  return { user, doctor };
}

async function seedConversationAndReport({ patientId, doctorId, transcript, summary, urgency, reviewStatus, nextAction }) {
  const existing = await prisma.report.findFirst({ where: { patientId } });
  if (existing) return;

  const conversation = await prisma.conversation.create({
    data: {
      patientId,
      status: 'COMPLETED',
      language: 'en-IN',
      messages: { create: transcript.map((m) => ({ sender: m.sender, text: m.text })) },
    },
  });

  const pdfBuffer = await buildPdfBuffer(summary);
  await prisma.report.create({
    data: {
      patientId,
      conversationId: conversation.id,
      doctorId: doctorId ?? null,
      summaryJson: summary,
      pdfData: pdfBuffer,
      urgencyLevel: urgency,
      reviewStatus,
      nextAction,
    },
  });
}

async function main() {
  const PASSWORD = 'password123';

  const { doctor } = await upsertUser({
    role: 'DOCTOR',
    name: 'Dr. Anjali Sharma',
    email: 'dr.sharma@airtribe.demo',
    password: PASSWORD,
    phone: '+91-9000000001',
    extra: { specialization: 'General Medicine' },
  });

  await upsertUser({
    role: 'DOCTOR',
    name: 'Super Admin',
    email: 'SuperAdmin',
    password: 'Admin@1234',
    phone: null,
    extra: { specialization: 'Administrator' },
  });

  const { patient: ramesh } = await upsertUser({
    role: 'PATIENT', name: 'Ramesh Kumar', email: 'ramesh@airtribe.demo', password: PASSWORD,
    phone: '+91-9000000002', extra: { age: 34, gender: 'Male', village: 'Chandpur', languagePref: 'hi-IN' },
  });
  const { patient: sunita } = await upsertUser({
    role: 'PATIENT', name: 'Sunita Devi', email: 'sunita@airtribe.demo', password: PASSWORD,
    phone: '+91-9000000003', extra: { age: 28, gender: 'Female', village: 'Rampur', languagePref: 'hi-IN' },
  });
  const { patient: bimal } = await upsertUser({
    role: 'PATIENT', name: 'Bimal Oraon', email: 'bimal@airtribe.demo', password: PASSWORD,
    phone: '+91-9000000004', extra: { age: 52, gender: 'Male', village: 'Latehar', languagePref: 'en-IN' },
  });
  await upsertUser({
    role: 'PATIENT', name: 'Priya Singh', email: 'priya@airtribe.demo', password: PASSWORD,
    phone: '+91-9000000005', extra: { age: 24, gender: 'Female', village: 'Bettiah', languagePref: 'hi-IN' },
  });

  await seedConversationAndReport({
    patientId: ramesh.id,
    doctorId: null,
    transcript: [
      { sender: 'PATIENT', text: 'I have had a mild fever and body ache since yesterday.' },
      { sender: 'AGENT', text: 'I am sorry to hear that. Is the fever constant or does it come and go? Any chills or sweating?' },
      { sender: 'PATIENT', text: 'It comes and goes, mostly in the evening. No chills.' },
      { sender: 'AGENT', text: 'Understood. Any cough, sore throat, or difficulty breathing?' },
      { sender: 'PATIENT', text: 'A little sore throat, nothing else.' },
    ],
    summary: {
      patient_info: { name: 'Ramesh Kumar', age: 34, gender: 'Male', village: 'Chandpur' },
      chief_complaint: 'Mild intermittent fever with sore throat for 1 day',
      symptom_summary: [
        { symptom: 'Fever', onset: '1 day ago', duration: 'Intermittent, evenings', severity: 'Mild' },
        { symptom: 'Sore throat', onset: '1 day ago', duration: 'Ongoing', severity: 'Mild' },
      ],
      relevant_history: 'None reported',
      red_flags: [],
      urgency_level: 'routine',
      possible_conditions: [
        { condition: 'Viral upper respiratory infection', rationale: 'Mild intermittent fever with sore throat, no red flags, short duration' },
      ],
      recommended_next_steps: 'Advise rest, fluids, and monitoring. Routine follow-up if symptoms persist beyond 3-4 days or worsen.',
    },
    urgency: 'ROUTINE',
    reviewStatus: 'PENDING',
    nextAction: 'NONE',
  });

  await seedConversationAndReport({
    patientId: sunita.id,
    doctorId: null,
    transcript: [
      { sender: 'PATIENT', text: 'I have loose motions since two days, more than 5 times a day.' },
      { sender: 'AGENT', text: 'That sounds uncomfortable. Is there any blood in the stool, or vomiting?' },
      { sender: 'PATIENT', text: 'No blood, but I vomited twice this morning. I feel very weak and thirsty.' },
      { sender: 'AGENT', text: 'Are you able to keep fluids down, and have you noticed reduced urination or dizziness?' },
      { sender: 'PATIENT', text: 'A little dizzy when I stand up, and I have not urinated much today.' },
    ],
    summary: {
      patient_info: { name: 'Sunita Devi', age: 28, gender: 'Female', village: 'Rampur' },
      chief_complaint: 'Diarrhea and vomiting for 2 days with signs of dehydration',
      symptom_summary: [
        { symptom: 'Diarrhea', onset: '2 days ago', duration: 'Ongoing, >5 times/day', severity: 'Moderate' },
        { symptom: 'Vomiting', onset: 'Today', duration: '2 episodes', severity: 'Moderate' },
        { symptom: 'Dizziness on standing', onset: 'Today', duration: 'Intermittent', severity: 'Moderate' },
      ],
      relevant_history: 'None reported',
      red_flags: ['Reduced urination', 'Dizziness on standing (possible dehydration)'],
      urgency_level: 'moderate',
      possible_conditions: [
        { condition: 'Acute gastroenteritis with moderate dehydration', rationale: 'Frequent diarrhea and vomiting with dizziness and reduced urine output suggest fluid loss' },
      ],
      recommended_next_steps: 'Start oral rehydration immediately. Recommend clinic visit today for assessment and IV fluids if dehydration signs persist.',
    },
    urgency: 'MODERATE',
    reviewStatus: 'PENDING',
    nextAction: 'NONE',
  });

  await seedConversationAndReport({
    patientId: bimal.id,
    doctorId: doctor.id,
    transcript: [
      { sender: 'PATIENT', text: 'I am having chest pain and it is hard to breathe since this morning.' },
      { sender: 'AGENT', text: 'This could be serious. Is the pain spreading to your arm, jaw, or back? Any sweating or nausea?' },
      { sender: 'PATIENT', text: 'Yes, it spreads to my left arm and I am sweating a lot.' },
      { sender: 'AGENT', text: 'This may be a medical emergency. Please get to the nearest hospital or call for emergency help immediately.' },
    ],
    summary: {
      patient_info: { name: 'Bimal Oraon', age: 52, gender: 'Male', village: 'Latehar' },
      chief_complaint: 'Chest pain radiating to left arm with breathlessness and sweating',
      symptom_summary: [
        { symptom: 'Chest pain', onset: 'This morning', duration: 'Ongoing', severity: 'Severe' },
        { symptom: 'Breathlessness', onset: 'This morning', duration: 'Ongoing', severity: 'Severe' },
        { symptom: 'Sweating', onset: 'This morning', duration: 'Ongoing', severity: 'Severe' },
      ],
      relevant_history: 'Age 52, male — higher cardiac risk profile',
      red_flags: ['Chest pain radiating to left arm', 'Associated sweating and breathlessness'],
      urgency_level: 'emergency',
      possible_conditions: [
        { condition: 'Possible acute cardiac event (e.g. myocardial infarction)', rationale: 'Classic radiating chest pain with sweating and breathlessness in an older male — requires immediate emergency evaluation' },
      ],
      recommended_next_steps: 'EMERGENCY: Refer to nearest hospital immediately for cardiac evaluation. Do not delay.',
    },
    urgency: 'EMERGENCY',
    reviewStatus: 'REVIEWED',
    nextAction: 'REFER_TO_HOSPITAL',
  });

  console.log('Seed complete.');
  console.log('Doctor login:  dr.sharma@airtribe.demo / password123');
  console.log('Patients:      ramesh@ / sunita@ / bimal@ / priya@airtribe.demo, all password123');
  console.log('priya@airtribe.demo has no report yet — use this account for the live demo flow.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
