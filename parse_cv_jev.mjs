import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { TypeSafeClient, choice, noul } from '@typesafe-ai/sdk';
import 'dotenv/config';

async function main() {
  // 1. Read and parse the CSV
  const csvData = fs.readFileSync('australia_point_calculation.csv', 'utf8');
  const records = parse(csvData, { columns: true, skip_empty_lines: true });

  // 2. Group by Category to build options dynamically
  const categories = {};
  for (const row of records) {
    if (!categories[row.Category]) {
      categories[row.Category] = {};
    }
    categories[row.Category][row.Option_ID] = {
      points: parseInt(row.Points, 10),
      description: row.Description,
      details: row.Details
    };
  }

  // 3. Helper to build choice objects for Jev
  function buildChoiceOptions(categoryName) {
    const options = {};
    for (const [optId, data] of Object.entries(categories[categoryName])) {
      options[optId] = data.details || data.description;
    }
    // Always include a 'none' or 'not_stated' fallback
    if (!options['none'] && !options['not_stated']) {
        options['none'] = "Does not apply or is not stated in the CV.";
    }
    return options;
  }

  // 4. Initialize TypeSafe Client
  // It automatically picks up process.env.TYPESAFE_API_KEY. 
  // Our .env has JEV_API_KEY, so we assign it.
  if (process.env.JEV_API_KEY && !process.env.TYPESAFE_API_KEY) {
      process.env.TYPESAFE_API_KEY = process.env.JEV_API_KEY;
  }
  const client = new TypeSafeClient();

  // 5. Load a sample CV (fallback to a default if not provided)
  const cvFile = process.argv[2] || 'temp/output.md';
  let cvText = "";
  if (fs.existsSync(cvFile)) {
      cvText = fs.readFileSync(cvFile, 'utf8');
      console.log(`Loaded CV from ${cvFile} (${cvText.length} characters)`);
  } else {
      cvText = `
      Name: Jane Doe
      DOB: 15/04/1995
      English: PTE Academic 82 overall
      Education: Bachelor of Software Engineering, RMIT University (Australia)
      Experience: 4 years working as a Software Engineer in Melbourne, Australia. 
      Partner: Single.
      Other: NAATI Credentialed Community Language passed.
      `;
      console.log("Using default sample CV text.");
  }

  // 6. Define Jev Questions
  console.log("Sending to Jev to extract points criteria...");
  const questions = {
    age: choice(
      "Based on the Date of Birth, what is the applicant's age bracket? If not stated, choose none.",
      buildChoiceOptions('Age')
    ),
    english: choice(
      "What is the applicant's highest proven English proficiency?",
      buildChoiceOptions('English')
    ),
    overseas_exp: choice(
      "How many years of skilled employment outside Australia does the applicant have?",
      buildChoiceOptions('Overseas Experience')
    ),
    aus_exp: choice(
      "How many years of skilled employment inside Australia does the applicant have?",
      buildChoiceOptions('Australian Experience')
    ),
    education: choice(
      "What is the applicant's highest educational qualification?",
      buildChoiceOptions('Education')
    ),
    partner_skills: choice(
      "What is the applicant's relationship and partner skill status?",
      buildChoiceOptions('Partner Skills')
    ),
    // Bonus Booleans
    specialist_edu: noul("Does the applicant have a Master by research or Doctorate from an Australian institution in a STEM field?"),
    aus_study: noul("Did the applicant complete at least 2 academic years of study in Australia?"),
    professional_year: noul("Did the applicant complete a Professional Year program in Australia?"),
    ccl: noul("Does the applicant hold a recognized credential in a community language (e.g., NAATI)?"),
    regional_study: noul("Did the applicant study and live in a designated regional area of Australia?"),
    state_nomination: noul("Is the applicant nominated by a State or Territory government?")
  };

  try {
    const response = await client.systemOne({
      state: { cv_text: cvText },
      questions: questions
    });

    const answers = response.answers;
    console.log("\n--- JEV EXTRACTION RESULTS ---");
    
    // Helper to format choice answers (turn 'none' or 'not_stated' into null)
    const formatChoice = (choiceVal) => {
      if (!choiceVal || choiceVal === 'none' || choiceVal === 'not_stated') return null;
      return choiceVal;
    };

    const extractedProfile = {
      ageBand: formatChoice(answers.age.choice),
      englishBand: formatChoice(answers.english.choice),
      overseasExpBand: formatChoice(answers.overseas_exp.choice),
      ausExpBand: formatChoice(answers.aus_exp.choice),
      educationBand: formatChoice(answers.education.choice),
      partnerSkillsBand: formatChoice(answers.partner_skills.choice),
      specialistEdu: answers.specialist_edu.yes,
      ausStudy: answers.aus_study.yes,
      professionalYear: answers.professional_year.yes,
      ccl: answers.ccl.yes,
      regionalStudy: answers.regional_study.yes,
      stateNomination: answers.state_nomination.yes
    };

    console.log(JSON.stringify(extractedProfile, null, 2));
    
  } catch (error) {
    console.error("Error calling TypeSafe API:", error.message);
  }
}

main();
