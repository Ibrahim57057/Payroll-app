// backend/seedDatabase.js
// ============================================================
// AATU PAYROLL SYSTEM — SEED DATABASE
// MATCHES YOUR EXACT SCHEMA
// ============================================================

const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("🌱 Seeding AATU Payroll Database...\n");

// ============================================================
// 1. FACULTIES
// ============================================================
const faculties = [
  { name: "Computing and Informatics" },
  { name: "Engineering" },
  { name: "Management Sciences" },
  { name: "Arts and Humanities" },
  { name: "Sciences" },
  { name: "Administration" },
];

// ============================================================
// 2. DEPARTMENTS (with faculty_id)
// ============================================================
const departments = [
  // Computing and Informatics
  { name: "Computer Science", faculty_id: null },
  { name: "Information Technology", faculty_id: null },
  { name: "Software Engineering", faculty_id: null },
  // Engineering
  { name: "Electrical Engineering", faculty_id: null },
  { name: "Mechanical Engineering", faculty_id: null },
  { name: "Civil Engineering", faculty_id: null },
  // Management Sciences
  { name: "Accounting", faculty_id: null },
  { name: "Business Administration", faculty_id: null },
  { name: "Economics", faculty_id: null },
  // Arts and Humanities
  { name: "Mass Communication", faculty_id: null },
  { name: "English Language", faculty_id: null },
  { name: "History", faculty_id: null },
  // Sciences
  { name: "Mathematics", faculty_id: null },
  { name: "Physics", faculty_id: null },
  { name: "Chemistry", faculty_id: null },
  { name: "Biology", faculty_id: null },
  // Administration
  { name: "Human Resources", faculty_id: null },
  { name: "Finance", faculty_id: null },
  { name: "Academic Affairs", faculty_id: null },
  { name: "ICT", faculty_id: null },
  { name: "Library", faculty_id: null },
  { name: "Student Affairs", faculty_id: null },
  { name: "Works and Maintenance", faculty_id: null },
];

// ============================================================
// 3. GRADE LEVELS
// NOTE: grade_level is INTEGER, step is INTEGER
// ============================================================
const gradeLevels = [
  // CONUASS (Academic)
  { grade_level: 1, step: 1, basic_salary: 185000 },
  { grade_level: 1, step: 2, basic_salary: 195000 },
  { grade_level: 2, step: 1, basic_salary: 215000 },
  { grade_level: 2, step: 2, basic_salary: 225000 },
  { grade_level: 3, step: 1, basic_salary: 250000 },
  { grade_level: 3, step: 2, basic_salary: 260000 },
  { grade_level: 4, step: 1, basic_salary: 290000 },
  { grade_level: 4, step: 2, basic_salary: 300000 },
  { grade_level: 5, step: 1, basic_salary: 330000 },
  { grade_level: 5, step: 2, basic_salary: 340000 },
  { grade_level: 6, step: 1, basic_salary: 380000 },
  { grade_level: 6, step: 2, basic_salary: 390000 },
  // CONTISS II (Non-academic)
  { grade_level: 1, step: 1, basic_salary: 165000 },
  { grade_level: 1, step: 2, basic_salary: 175000 },
  { grade_level: 2, step: 1, basic_salary: 190000 },
  { grade_level: 2, step: 2, basic_salary: 200000 },
  { grade_level: 3, step: 1, basic_salary: 220000 },
  { grade_level: 3, step: 2, basic_salary: 230000 },
  { grade_level: 4, step: 1, basic_salary: 250000 },
  { grade_level: 4, step: 2, basic_salary: 260000 },
  // Contract Staff
  { grade_level: 1, step: 1, basic_salary: 150000 },
  { grade_level: 2, step: 1, basic_salary: 180000 },
  { grade_level: 3, step: 1, basic_salary: 210000 },
];

// ============================================================
// 4. ALLOWANCE TYPES
// Columns: name, category, value_type, value, is_active
// ============================================================
const allowanceTypes = [
  {
    name: "Housing Allowance",
    category: "both",
    value_type: "percentage",
    value: 15,
    is_active: true,
  },
  {
    name: "Transport Allowance",
    category: "both",
    value_type: "percentage",
    value: 10,
    is_active: true,
  },
  {
    name: "Research Allowance",
    category: "academic",
    value_type: "percentage",
    value: 10,
    is_active: true,
  },
  {
    name: "Medical Allowance",
    category: "non-academic",
    value_type: "percentage",
    value: 5,
    is_active: true,
  },
  {
    name: "Risk Allowance",
    category: "both",
    value_type: "percentage",
    value: 8,
    is_active: true,
  },
  {
    name: "Leave Allowance",
    category: "both",
    value_type: "percentage",
    value: 10,
    is_active: true,
  },
];

// ============================================================
// 5. DEDUCTION TYPES
// Columns: name, category, value_type, value, is_statutory
// ============================================================
const deductionTypes = [
  {
    name: "PAYE Tax",
    category: "statutory",
    value_type: "percentage",
    value: 0,
    is_statutory: true,
  },
  {
    name: "Pension (Employee)",
    category: "statutory",
    value_type: "percentage",
    value: 8,
    is_statutory: true,
  },
  {
    name: "Pension (Employer)",
    category: "statutory",
    value_type: "percentage",
    value: 10,
    is_statutory: true,
  },
  {
    name: "NHF",
    category: "statutory",
    value_type: "percentage",
    value: 2.5,
    is_statutory: true,
  },
  {
    name: "NHIS",
    category: "statutory",
    value_type: "percentage",
    value: 5,
    is_statutory: true,
  },
  {
    name: "NSITF",
    category: "statutory",
    value_type: "percentage",
    value: 1,
    is_statutory: true,
  },
];

// ============================================================
// 6. TAX BANDS
// ============================================================
const taxBands = [
  { min_income: 0, max_income: 300000, rate: 7 },
  { min_income: 300001, max_income: 600000, rate: 11 },
  { min_income: 600001, max_income: 1100000, rate: 15 },
  { min_income: 1100001, max_income: 1600000, rate: 19 },
  { min_income: 1600001, max_income: 3200000, rate: 21 },
  { min_income: 3200001, max_income: 99999999, rate: 24 },
];

// ============================================================
// 7. LEAVE TYPES
// ============================================================
const leaveTypes = [
  {
    name: "Annual Leave",
    days_entitled: 30,
    affects_salary: false,
    is_active: true,
  },
  {
    name: "Sick Leave",
    days_entitled: 15,
    affects_salary: false,
    is_active: true,
  },
  {
    name: "Maternity Leave",
    days_entitled: 90,
    affects_salary: false,
    is_active: true,
  },
  {
    name: "Paternity Leave",
    days_entitled: 14,
    affects_salary: false,
    is_active: true,
  },
  {
    name: "Study Leave",
    days_entitled: 365,
    affects_salary: false,
    is_active: true,
  },
  {
    name: "Sabbatical Leave",
    days_entitled: 365,
    affects_salary: false,
    is_active: true,
  },
  {
    name: "Unpaid Leave",
    days_entitled: 0,
    affects_salary: true,
    is_active: true,
  },
  {
    name: "Compassionate Leave",
    days_entitled: 3,
    affects_salary: false,
    is_active: true,
  },
];

// ============================================================
// 8. STAFF
// ============================================================
const staff = [
  // ===== ACADEMIC STAFF =====
  {
    first_name: "Olusegun",
    last_name: "Adekunle",
    email: "o.adekunle@tech-u.edu.ng",
    staff_id: "AATU/ACAD/001",
    category: "academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2020-01-15",
    nhf_number: "NHF/001",
    pfa_name: "Stanbic IBTC Pension",
    rsa_pin: "RSA/001",
    tax_id: "TIN/001",
    phone: "08031234567",
  },
  {
    first_name: "Amina",
    last_name: "Mohammed",
    email: "a.mohammed@tech-u.edu.ng",
    staff_id: "AATU/ACAD/002",
    category: "academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2021-06-01",
    nhf_number: "NHF/002",
    pfa_name: "First Guarantee Pension",
    rsa_pin: "RSA/002",
    tax_id: "TIN/002",
    phone: "08034567890",
  },
  {
    first_name: "Chidi",
    last_name: "Okonkwo",
    email: "c.okonkwo@tech-u.edu.ng",
    staff_id: "AATU/ACAD/003",
    category: "academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2019-09-10",
    nhf_number: "NHF/003",
    pfa_name: "Access Pension",
    rsa_pin: "RSA/003",
    tax_id: "TIN/003",
    phone: "08035678901",
  },
  {
    first_name: "Folake",
    last_name: "Ogunleye",
    email: "f.ogunleye@tech-u.edu.ng",
    staff_id: "AATU/ACAD/004",
    category: "academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2022-01-20",
    nhf_number: "NHF/004",
    pfa_name: "Stanbic IBTC Pension",
    rsa_pin: "RSA/004",
    tax_id: "TIN/004",
    phone: "08036789012",
  },
  {
    first_name: "Babatunde",
    last_name: "Adebayo",
    email: "b.adebayo@tech-u.edu.ng",
    staff_id: "AATU/ACAD/005",
    category: "academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2023-03-15",
    nhf_number: "NHF/005",
    pfa_name: "First Guarantee Pension",
    rsa_pin: "RSA/005",
    tax_id: "TIN/005",
    phone: "08037890123",
  },
  {
    first_name: "Ngozi",
    last_name: "Eze",
    email: "n.eze@tech-u.edu.ng",
    staff_id: "AATU/ACAD/006",
    category: "academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2020-11-01",
    nhf_number: "NHF/006",
    pfa_name: "Access Pension",
    rsa_pin: "RSA/006",
    tax_id: "TIN/006",
    phone: "08038901234",
  },
  {
    first_name: "Yusuf",
    last_name: "Bello",
    email: "y.bello@tech-u.edu.ng",
    staff_id: "AATU/ACAD/007",
    category: "academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2018-08-15",
    nhf_number: "NHF/007",
    pfa_name: "Stanbic IBTC Pension",
    rsa_pin: "RSA/007",
    tax_id: "TIN/007",
    phone: "08039012345",
  },
  {
    first_name: "Grace",
    last_name: "Obiora",
    email: "g.obiora@tech-u.edu.ng",
    staff_id: "AATU/ACAD/008",
    category: "academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2021-10-10",
    nhf_number: "NHF/008",
    pfa_name: "First Guarantee Pension",
    rsa_pin: "RSA/008",
    tax_id: "TIN/008",
    phone: "08040123456",
  },
  // ===== NON-ACADEMIC STAFF =====
  {
    first_name: "Sunday",
    last_name: "Okafor",
    email: "s.okafor@tech-u.edu.ng",
    staff_id: "AATU/NA/001",
    category: "non-academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2020-03-01",
    nhf_number: "NHF/009",
    pfa_name: "Access Pension",
    rsa_pin: "RSA/009",
    tax_id: "TIN/009",
    phone: "08041234567",
  },
  {
    first_name: "Faith",
    last_name: "Johnson",
    email: "f.johnson@tech-u.edu.ng",
    staff_id: "AATU/NA/002",
    category: "non-academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2021-07-15",
    nhf_number: "NHF/010",
    pfa_name: "Stanbic IBTC Pension",
    rsa_pin: "RSA/010",
    tax_id: "TIN/010",
    phone: "08042345678",
  },
  {
    first_name: "Victor",
    last_name: "Emeka",
    email: "v.emeka@tech-u.edu.ng",
    staff_id: "AATU/NA/003",
    category: "non-academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2022-05-20",
    nhf_number: "NHF/011",
    pfa_name: "First Guarantee Pension",
    rsa_pin: "RSA/011",
    tax_id: "TIN/011",
    phone: "08043456789",
  },
  {
    first_name: "Esther",
    last_name: "Ibrahim",
    email: "e.ibrahim@tech-u.edu.ng",
    staff_id: "AATU/NA/004",
    category: "non-academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2023-01-10",
    nhf_number: "NHF/012",
    pfa_name: "Access Pension",
    rsa_pin: "RSA/012",
    tax_id: "TIN/012",
    phone: "08044567890",
  },
  {
    first_name: "Peter",
    last_name: "Adeyemi",
    email: "p.adeyemi@tech-u.edu.ng",
    staff_id: "AATU/NA/005",
    category: "non-academic",
    grade_level_id: null,
    department_id: null,
    date_employed: "2020-09-01",
    nhf_number: "NHF/013",
    pfa_name: "Stanbic IBTC Pension",
    rsa_pin: "RSA/013",
    tax_id: "TIN/013",
    phone: "08045678901",
  },
  // ===== CONTRACT STAFF =====
  {
    first_name: "Mary",
    last_name: "Okonkwo",
    email: "m.okonkwo@tech-u.edu.ng",
    staff_id: "AATU/CON/001",
    category: "contract",
    grade_level_id: null,
    department_id: null,
    date_employed: "2023-06-01",
    nhf_number: "NHF/014",
    pfa_name: "First Guarantee Pension",
    rsa_pin: "RSA/014",
    tax_id: "TIN/014",
    phone: "08046789012",
  },
  {
    first_name: "James",
    last_name: "Okoro",
    email: "j.okoro@tech-u.edu.ng",
    staff_id: "AATU/CON/002",
    category: "contract",
    grade_level_id: null,
    department_id: null,
    date_employed: "2023-08-15",
    nhf_number: "NHF/015",
    pfa_name: "Access Pension",
    rsa_pin: "RSA/015",
    tax_id: "TIN/015",
    phone: "08047890123",
  },
];

// ============================================================
// 9. USERS
// ============================================================
const users = [
  {
    full_name: "Dr. Olusegun Adekunle",
    email: "admin@tech-u.edu.ng",
    role: "admin",
    staff_id: null,
  },
  {
    full_name: "Chidi Okonkwo",
    email: "bursar@tech-u.edu.ng",
    role: "bursar",
    staff_id: null,
  },
  {
    full_name: "Sunday Okafor",
    email: "hr@tech-u.edu.ng",
    role: "hr_officer",
    staff_id: null,
  },
  {
    full_name: "Prof. A. A. Oladipo",
    email: "vc@tech-u.edu.ng",
    role: "vc",
    staff_id: null,
  },
  {
    full_name: "Amina Mohammed",
    email: "staff@tech-u.edu.ng",
    role: "staff",
    staff_id: null,
  },
];

// ============================================================
// 10. EXECUTE SEED
// ============================================================
async function seedDatabase() {
  try {
    console.log("🚀 Starting database seeding...\n");

    // --- Insert Faculties ---
    console.log("📚 Inserting faculties...");
    const facultyMap = {};
    for (const faculty of faculties) {
      const { data, error } = await supabase
        .from("faculties")
        .insert(faculty)
        .select()
        .single();
      if (error && !error.message.includes("duplicate")) {
        console.error("Faculty error:", error.message);
      } else if (data) {
        facultyMap[faculty.name] = data.id;
      }
    }

    // --- Get existing faculties if insert failed ---
    if (Object.keys(facultyMap).length === 0) {
      const { data } = await supabase.from("faculties").select("id, name");
      if (data) {
        data.forEach((f) => {
          facultyMap[f.name] = f.id;
        });
      }
    }

    // --- Insert Departments ---
    console.log("🏛️ Inserting departments...");
    const deptMap = {};
    for (const dept of departments) {
      // Map faculty name to ID
      let facultyId = null;
      if (
        [
          "Computer Science",
          "Information Technology",
          "Software Engineering",
        ].includes(dept.name)
      ) {
        facultyId = facultyMap["Computing and Informatics"];
      } else if (
        [
          "Electrical Engineering",
          "Mechanical Engineering",
          "Civil Engineering",
        ].includes(dept.name)
      ) {
        facultyId = facultyMap["Engineering"];
      } else if (
        ["Accounting", "Business Administration", "Economics"].includes(
          dept.name,
        )
      ) {
        facultyId = facultyMap["Management Sciences"];
      } else if (
        ["Mass Communication", "English Language", "History"].includes(
          dept.name,
        )
      ) {
        facultyId = facultyMap["Arts and Humanities"];
      } else if (
        ["Mathematics", "Physics", "Chemistry", "Biology"].includes(dept.name)
      ) {
        facultyId = facultyMap["Sciences"];
      } else {
        facultyId = facultyMap["Administration"];
      }

      const deptData = { name: dept.name, faculty_id: facultyId };
      const { data, error } = await supabase
        .from("departments")
        .insert(deptData)
        .select()
        .single();
      if (error && !error.message.includes("duplicate")) {
        console.error("Department error:", error.message);
      } else if (data) {
        deptMap[dept.name] = data.id;
      }
    }

    // --- Insert Grade Levels ---
    console.log("📊 Inserting grade levels...");
    const gradeMap = {};
    for (const gl of gradeLevels) {
      const { data, error } = await supabase
        .from("grade_levels")
        .insert(gl)
        .select()
        .single();
      if (error && !error.message.includes("duplicate")) {
        console.error("Grade level error:", error.message);
      } else if (data) {
        gradeMap[`${gl.grade_level}-${gl.step}`] = data.id;
      }
    }

    // --- Insert Allowance Types ---
    console.log("💰 Inserting allowance types...");
    for (const allow of allowanceTypes) {
      const { error } = await supabase.from("allowance_types").insert(allow);
      if (error && !error.message.includes("duplicate")) {
        console.error("Allowance error:", error.message);
      }
    }

    // --- Insert Deduction Types ---
    console.log("➖ Inserting deduction types...");
    for (const ded of deductionTypes) {
      const { error } = await supabase.from("deduction_types").insert(ded);
      if (error && !error.message.includes("duplicate")) {
        console.error("Deduction error:", error.message);
      }
    }

    // --- Insert Tax Bands ---
    console.log("📋 Inserting tax bands...");
    for (const tax of taxBands) {
      const { error } = await supabase.from("tax_bands").insert(tax);
      if (error && !error.message.includes("duplicate")) {
        console.error("Tax band error:", error.message);
      }
    }

    // --- Insert Leave Types ---
    console.log("📅 Inserting leave types...");
    for (const leave of leaveTypes) {
      const { error } = await supabase.from("leave_types").insert(leave);
      if (error && !error.message.includes("duplicate")) {
        console.error("Leave type error:", error.message);
      }
    }

    // --- Insert Staff ---
    console.log("👥 Inserting staff...");

    // Get existing staff emails
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("email");
    const staffEmails = existingStaff ? existingStaff.map((s) => s.email) : [];

    const gradeKeys = [
      "5-1",
      "4-1",
      "6-1",
      "3-1",
      "1-1",
      "4-1",
      "5-1",
      "3-1",
      "4-1",
      "3-1",
      "2-1",
      "1-1",
      "2-1",
      "1-1",
      "2-1",
    ];

    const deptNames = [
      "Computer Science",
      "Mathematics",
      "Electrical Engineering",
      "Accounting",
      "Mass Communication",
      "Chemistry",
      "Software Engineering",
      "English Language",
      "Human Resources",
      "Finance",
      "ICT",
      "Library",
      "Works and Maintenance",
      "Student Affairs",
      "Information Technology",
    ];

    for (let i = 0; i < staff.length; i++) {
      const s = staff[i];

      if (staffEmails.includes(s.email)) {
        console.log(`⏭️ Skipping ${s.email} (already exists)`);
        continue;
      }

      const gradeKey = gradeKeys[i] || gradeKeys[0];
      const deptName = deptNames[i] || deptNames[0];

      const staffData = {
        ...s,
        grade_level_id: gradeMap[gradeKey] || null,
        department_id: deptMap[deptName] || null,
      };

      const { error } = await supabase.from("staff").insert(staffData);
      if (error) {
        console.error("Staff error:", error.message);
      }
    }

    // --- Insert Users ---
    console.log("👤 Inserting users...");
    for (const u of users) {
      const { error } = await supabase.from("users").insert(u);
      if (error && !error.message.includes("duplicate")) {
        console.error("User error:", error.message);
      }
    }

    console.log("\n✅ Database seeding complete!");
    console.log(`📊 Summary:
      - ${faculties.length} faculties
      - ${departments.length} departments  
      - ${gradeLevels.length} grade levels
      - ${allowanceTypes.length} allowance types
      - ${deductionTypes.length} deduction types
      - ${taxBands.length} tax bands
      - ${leaveTypes.length} leave types
      - ${staff.length} staff members
      - ${users.length} users
    `);

    console.log("\n🔑 Login Credentials:");
    console.log("📧 admin@tech-u.edu.ng / password123 (Admin)");
    console.log("📧 bursar@tech-u.edu.ng / password123 (Bursar)");
    console.log("📧 hr@tech-u.edu.ng / password123 (HR Officer)");
    console.log("📧 vc@tech-u.edu.ng / password123 (Vice Chancellor)");
    console.log("📧 staff@tech-u.edu.ng / password123 (Staff)");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  }
}

// Run the seed
seedDatabase();
