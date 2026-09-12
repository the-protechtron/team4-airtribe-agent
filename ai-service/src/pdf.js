const PDFDocument = require('pdfkit');

function buildPdfBuffer(patientInfo, summary) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Airtribe — Primary Health Condition Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Patient: ${patientInfo.name ?? '-'}`);
    doc.text(`Age / Gender: ${patientInfo.age ?? '-'} / ${patientInfo.gender ?? '-'}`);
    doc.text(`Village: ${patientInfo.village ?? '-'}`);
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

module.exports = { buildPdfBuffer };
